// API Base URL
const API_URL = '';

// Global state
let selectedBookImage = null;
let checkoutBookImage = null;

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load books list when switching to browse tab
    if (tabName === 'browse') {
      loadBooks();
    }
  });
});

// Add Book functionality
document.getElementById('add-book-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    selectedBookImage = file;
    displayImagePreview(file, 'add-book-preview');
    document.getElementById('analyze-btn').style.display = 'block';
  }
});

document.getElementById('analyze-btn').addEventListener('click', async () => {
  if (!selectedBookImage) {
    showResult('add-book-result', 'Please select an image first', 'error');
    return;
  }

  showLoading(true);
  
  try {
    const formData = new FormData();
    formData.append('image', selectedBookImage);

    const response = await fetch(`${API_URL}/api/books/analyze`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      showResult('add-book-result', 
        `✅ Book added successfully!<br><strong>${data.book.title}</strong><br>by ${data.book.author}`, 
        'success'
      );
      // Reset form
      document.getElementById('add-book-input').value = '';
      document.getElementById('add-book-preview').innerHTML = '';
      document.getElementById('analyze-btn').style.display = 'none';
      selectedBookImage = null;
    } else {
      showResult('add-book-result', `Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showResult('add-book-result', `Error: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
});

// Checkout functionality
document.getElementById('select-existing-btn').addEventListener('click', async () => {
  document.getElementById('book-select-section').style.display = 'block';
  document.getElementById('checkout-camera-section').style.display = 'none';
  document.getElementById('checkout-btn').style.display = 'block';
  checkoutBookImage = null;
  
  // Load books into select
  await loadBooksForSelect();
});

document.getElementById('photo-checkout-btn').addEventListener('click', () => {
  document.getElementById('book-select-section').style.display = 'none';
  document.getElementById('checkout-camera-section').style.display = 'block';
  document.getElementById('checkout-btn').style.display = 'block';
});

document.getElementById('checkout-book-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    checkoutBookImage = file;
    displayImagePreview(file, 'checkout-book-preview');
  }
});

document.getElementById('checkout-btn').addEventListener('click', async () => {
  const userName = document.getElementById('user-name').value.trim();
  
  if (!userName) {
    showResult('checkout-result', 'Please enter your name', 'error');
    return;
  }

  const bookId = document.getElementById('book-select').value;
  
  if (!checkoutBookImage && !bookId) {
    showResult('checkout-result', 'Please select a book or take a photo', 'error');
    return;
  }

  showLoading(true);
  
  try {
    const formData = new FormData();
    formData.append('userName', userName);
    
    if (checkoutBookImage) {
      formData.append('image', checkoutBookImage);
    } else {
      formData.append('bookId', bookId);
    }

    const response = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      showResult('checkout-result', 
        `✅ Book checked out successfully!<br><strong>${data.checkout.bookTitle}</strong><br>by ${data.checkout.bookAuthor}<br>Checked out by: ${userName}`, 
        'success'
      );
      // Reset form
      document.getElementById('user-name').value = '';
      document.getElementById('book-select').value = '';
      document.getElementById('checkout-book-input').value = '';
      document.getElementById('checkout-book-preview').innerHTML = '';
      document.getElementById('book-select-section').style.display = 'none';
      document.getElementById('checkout-camera-section').style.display = 'none';
      document.getElementById('checkout-btn').style.display = 'none';
      checkoutBookImage = null;
    } else {
      showResult('checkout-result', `Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showResult('checkout-result', `Error: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
});

// Load books for browse tab
async function loadBooks() {
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/api/books`);
    const data = await response.json();
    
    const booksList = document.getElementById('books-list');
    
    if (data.books.length === 0) {
      booksList.innerHTML = '<div class="empty-state"><p>No books in the library yet. Add some books!</p></div>';
    } else {
      booksList.innerHTML = data.books.map(book => `
        <div class="book-card">
          <h3>${escapeHtml(book.title)}</h3>
          <p>by ${escapeHtml(book.author)}</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">Added: ${formatDate(book.created_at)}</p>
        </div>
      `).join('');
    }
  } catch (error) {
    document.getElementById('books-list').innerHTML = `<div class="empty-state"><p>Error loading books: ${error.message}</p></div>`;
  } finally {
    showLoading(false);
  }
}

// Load books for select dropdown
async function loadBooksForSelect() {
  try {
    const response = await fetch(`${API_URL}/api/books`);
    const data = await response.json();
    
    const select = document.getElementById('book-select');
    select.innerHTML = '<option value="">-- Select a book --</option>';
    
    data.books.forEach(book => {
      const option = document.createElement('option');
      option.value = book.id;
      option.textContent = `${book.title} by ${book.author}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading books:', error);
  }
}

// Helper functions
function displayImagePreview(file, containerId) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

function showResult(elementId, message, type) {
  const resultElement = document.getElementById(elementId);
  resultElement.innerHTML = message;
  resultElement.className = `result ${type}`;
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      resultElement.style.display = 'none';
    }, 5000);
  }
}

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

// Load books on page load if on browse tab
if (document.querySelector('.tab-content.active').id === 'browse') {
  loadBooks();
}
