// API Base URL
const API_URL = '';

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCheckouts();
  loadBooks();
});

async function loadCheckouts() {
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/api/checkouts`);
    const data = await response.json();
    
    // Update stats
    document.getElementById('total-checkouts').textContent = data.checkouts.length;
    
    // Display checkouts table
    const container = document.getElementById('checkouts-table');
    
    if (data.checkouts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No checkouts yet</p></div>';
    } else {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>User</th>
              <th>Book Title</th>
              <th>Author</th>
            </tr>
          </thead>
          <tbody>
            ${data.checkouts.map(checkout => `
              <tr>
                <td>${formatDate(checkout.checkout_date)}</td>
                <td>${escapeHtml(checkout.user_name)}</td>
                <td>${escapeHtml(checkout.book_title)}</td>
                <td>${escapeHtml(checkout.book_author)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    document.getElementById('checkouts-table').innerHTML = 
      `<div class="empty-state"><p>Error loading checkouts: ${error.message}</p></div>`;
  } finally {
    showLoading(false);
  }
}

async function loadBooks() {
  try {
    const response = await fetch(`${API_URL}/api/books`);
    const data = await response.json();
    
    // Update stats
    document.getElementById('total-books').textContent = data.books.length;
    
    // Display books table
    const container = document.getElementById('all-books-table');
    
    if (data.books.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No books in library yet</p></div>';
    } else {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Author</th>
              <th>Date Added</th>
            </tr>
          </thead>
          <tbody>
            ${data.books.map(book => `
              <tr>
                <td>${book.id}</td>
                <td>${escapeHtml(book.title)}</td>
                <td>${escapeHtml(book.author)}</td>
                <td>${formatDate(book.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    document.getElementById('all-books-table').innerHTML = 
      `<div class="empty-state"><p>Error loading books: ${error.message}</p></div>`;
  }
}

// Helper functions
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
