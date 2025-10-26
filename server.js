require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const { initDatabase, addBook, getAllBooks, checkoutBook, getAllCheckouts, getBook } = require('./database');
const { analyzeBookImage } = require('./openai-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize database
initDatabase();

// API Routes

// Analyze book image and add to database
app.post('/api/books/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Analyze image with OpenAI
    const bookInfo = await analyzeBookImage(base64Image);
    
    if (!bookInfo.title) {
      return res.status(400).json({ error: 'Could not extract book information from image' });
    }

    // Add book to database
    const bookId = await addBook(bookInfo.title, bookInfo.author);
    
    res.json({ 
      success: true, 
      book: { 
        id: bookId, 
        title: bookInfo.title, 
        author: bookInfo.author 
      } 
    });
  } catch (error) {
    console.error('Error analyzing book:', error);
    res.status(500).json({ error: 'Failed to analyze book image', details: error.message });
  }
});

// Get all books
app.get('/api/books', async (req, res) => {
  try {
    const books = await getAllBooks();
    res.json({ books });
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Failed to get books' });
  }
});

// Checkout a book
app.post('/api/checkout', upload.single('image'), async (req, res) => {
  try {
    const { userName, bookId } = req.body;
    
    if (!userName) {
      return res.status(400).json({ error: 'User name is required' });
    }

    let finalBookId = bookId;

    // If image is provided, analyze it first
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const bookInfo = await analyzeBookImage(base64Image);
      
      if (!bookInfo.title) {
        return res.status(400).json({ error: 'Could not extract book information from image' });
      }

      // Add book to database if not exists
      finalBookId = await addBook(bookInfo.title, bookInfo.author);
    }

    if (!finalBookId) {
      return res.status(400).json({ error: 'Book ID is required or provide an image' });
    }

    // Get book details
    const book = await getBook(finalBookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Create checkout record
    const checkoutId = await checkoutBook(finalBookId, userName);
    
    res.json({ 
      success: true, 
      checkout: { 
        id: checkoutId, 
        bookId: finalBookId,
        bookTitle: book.title,
        bookAuthor: book.author,
        userName,
        checkoutDate: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Error checking out book:', error);
    res.status(500).json({ error: 'Failed to checkout book', details: error.message });
  }
});

// Get all checkouts (for admin dashboard)
app.get('/api/checkouts', async (req, res) => {
  try {
    const checkouts = await getAllCheckouts();
    res.json({ checkouts });
  } catch (error) {
    console.error('Error getting checkouts:', error);
    res.status(500).json({ error: 'Failed to get checkouts' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Library System server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
  console.log(`Access admin dashboard at http://localhost:${PORT}/admin`);
});
