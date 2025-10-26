const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'library.db');
let db;

// Initialize database
function initDatabase() {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      createTables();
    }
  });
}

// Create tables
function createTables() {
  db.serialize(() => {
    // Books table
    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Checkouts table
    db.run(`
      CREATE TABLE IF NOT EXISTS checkouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        checkout_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
      )
    `);

    console.log('Database tables created');
  });
}

// Add a book to the database
async function addBook(title, author) {
  return new Promise((resolve, reject) => {
    // First check if book already exists
    db.get(
      'SELECT id FROM books WHERE title = ? AND author = ?',
      [title, author],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          // Book already exists, return existing ID
          resolve(row.id);
          return;
        }

        // Book doesn't exist, insert new record
        db.run(
          'INSERT INTO books (title, author) VALUES (?, ?)',
          [title, author],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      }
    );
  });
}

// Get all books
async function getAllBooks() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM books ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get a single book by ID
async function getBook(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Checkout a book
async function checkoutBook(bookId, userName) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO checkouts (book_id, user_name) VALUES (?, ?)',
      [bookId, userName],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Get all checkouts with book information
async function getAllCheckouts() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        c.id, 
        c.book_id, 
        c.user_name, 
        c.checkout_date,
        b.title as book_title,
        b.author as book_author
      FROM checkouts c
      JOIN books b ON c.book_id = b.id
      ORDER BY c.checkout_date DESC`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

module.exports = {
  initDatabase,
  addBook,
  getAllBooks,
  getBook,
  checkoutBook,
  getAllCheckouts
};
