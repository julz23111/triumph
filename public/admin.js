// public/admin.js (ES module)

const API_URL = '';
const $ = (s, r=document) => r.querySelector(s);
const loadingEl = $('#loading');
const loadingTpl = $('#loading-template');

function showLoading(text='Loading...'){
  loadingEl.innerHTML = '';
  if (loadingTpl?.content){
    const node = loadingTpl.content.cloneNode(true);
    const p = node.querySelector('p');
    if (p) p.textContent = text;
    loadingEl.appendChild(node);
  } else {
    loadingEl.textContent = text;
  }
  loadingEl.style.display = 'flex';
  loadingEl.setAttribute('aria-hidden','false');
}
function hideLoading(){
  loadingEl.style.display = 'none';
  loadingEl.setAttribute('aria-hidden','true');
  loadingEl.innerHTML = '';
}

function escapeHtml(text=''){
  return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[ch]));
}
function formatDate(s){ const d = new Date(s); return d.toLocaleDateString()+' '+d.toLocaleTimeString(); }

async function getJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function loadStats(){
  try {
    const data = await getJSON(`${API_URL}/api/admin/summary`);
    $('#total-books').textContent = data?.totalBooks ?? 0;
    $('#total-checkouts').textContent = data?.totalCheckouts ?? 0;
  } catch(e){
    console.error('Error loading stats:', e);
  }
}

function renderTable(el, rows, headers){
  const tbl = document.createElement('table');
  if (headers?.length){
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tbl.appendChild(thead);
  }
  const tbody = document.createElement('tbody');
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    r.forEach(c=>{
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  el.innerHTML = '';
  el.appendChild(tbl);
}

async function loadCheckouts(){
  try {
    const data = await getJSON(`${API_URL}/api/admin/checkouts`);
    const rows = (data?.items||[]).map(x=>[
      formatDate(x.checkout_date),
      escapeHtml(x.user_name),
      escapeHtml(x.book_title),
      escapeHtml(x.book_author)
    ]);
    renderTable($('#checkouts-table'), rows, ['Date/Time','User','Book Title','Author']);
    $('#total-checkouts').textContent = rows.length;
  } catch(e){
    $('#checkouts-table').innerHTML = `<div class="empty-state"><p>Error loading checkouts: ${escapeHtml(e.message)}</p></div>`;
  }
}

async function loadBooks(){
  try {
    const data = await getJSON(`${API_URL}/api/admin/books`);
    const rows = (data?.books||[]).map(b=>[
      b.id,
      escapeHtml(b.title),
      escapeHtml(b.author),
      formatDate(b.created_at)
    ]);
    renderTable($('#all-books-table'), rows, ['ID','Title','Author','Date Added']);
    $('#total-books').textContent = rows.length;
  } catch(e){
    $('#all-books-table').innerHTML = `<div class="empty-state"><p>Error loading books: ${escapeHtml(e.message)}</p></div>`;
  }
}

window.loadCheckouts = async function(){ try { showLoading('Refreshing...'); await loadCheckouts(); } finally { hideLoading(); } }

(async function init(){
  try {
    showLoading('Loading dashboard...');
    await Promise.all([loadStats(), loadCheckouts(), loadBooks()]);
  } catch(e){ console.error(e); }
  finally { hideLoading(); }
})();
