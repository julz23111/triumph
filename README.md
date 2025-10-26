# 📚 Triumph - Library System

A modern, mobile-friendly web application for managing library books with AI-powered image recognition using OpenAI's Vision API.

## Features

- 📸 **Image Recognition**: Take photos of books to automatically extract titles and authors
- 📖 **Book Management**: Add books to the library database
- ✅ **Check Out System**: Log book checkouts with user names
- 📊 **Admin Dashboard**: View all checkouts and library statistics
- 📱 **Mobile Friendly**: Responsive design optimized for mobile devices
- 🤖 **AI Powered**: Uses OpenAI Vision API for book information extraction

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/julz23111/triumph.git
cd triumph
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:
```
OPENAI_TOKEN=your_openai_api_key_here
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
   - Main app: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin

## How to Use

### Adding Books
1. Go to the "Add Book" tab
2. Click "📷 Take Photo" and select/capture an image of a book
3. Click "Analyze & Add Book"
4. The AI will extract the title and author and add it to the library

### Checking Out Books
1. Go to the "Check Out" tab
2. Enter your name
3. Either:
   - Select an existing book from the dropdown, OR
   - Take a photo of a new book
4. Click "Check Out Book"

### Admin Dashboard
- View total books and checkouts
- See detailed checkout history with timestamps
- Browse all books in the library
- Refresh data in real-time

## API Endpoints

### POST /api/books/analyze
Analyze a book image and add it to the database
- Body: multipart/form-data with `image` field
- Returns: Book information (id, title, author)

### GET /api/books
Get all books in the library
- Returns: Array of books

### POST /api/checkout
Check out a book
- Body: multipart/form-data with `userName` and either `bookId` or `image`
- Returns: Checkout information

### GET /api/checkouts
Get all checkout records
- Returns: Array of checkouts with book and user information

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **AI**: OpenAI Vision API (GPT-4o-mini)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Image Processing**: Multer for file uploads

## Mobile Features

- Camera integration for capturing book images
- Responsive design that works on all screen sizes
- Touch-friendly interface
- Optimized for mobile browsers

## License

ISC

## Author

Created for easy library management with modern AI technology.
