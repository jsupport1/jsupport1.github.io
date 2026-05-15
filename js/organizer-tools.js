const { PDFDocument } = PDFLib;

const state = {
  originalBuffer: null,
  pdfjsDoc: null,
  pages: [] // { id, originalIndex, thumbUrl }
};

const elements = {
  uploadScreen: document.getElementById('upload-screen'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  pageGrid: document.getElementById('page-grid'),
  btnSave: document.getElementById('btn-save-changes'),
  btnExtract: document.getElementById('btn-extract'),
  btnSelectAll: document.getElementById('btn-select-all')
};

// --- Initialization ---

elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

async function handleFile(file) {
  if (!file) return;
  elements.uploadScreen.style.display = 'none';
  const arrayBuffer = await file.arrayBuffer();
  state.originalBuffer = arrayBuffer;
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  state.pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  
  await generateThumbnails();
  initSortable();
}

async function generateThumbnails() {
  elements.pageGrid.innerHTML = '';
  state.pages = [];
  
  for (let i = 1; i <= state.pdfjsDoc.numPages; i++) {
    const page = await state.pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    const thumbUrl = canvas.toDataURL();
    
    const pageId = `page-${Date.now()}-${i}`;
    state.pages.push({ id: pageId, originalIndex: i - 1, thumbUrl });
    
    const card = createPageCard(pageId, i, thumbUrl);
    elements.pageGrid.appendChild(card);
  }
}

function createPageCard(id, num, thumbUrl) {
  const card = document.createElement('div');
  card.className = 'page-card';
  card.dataset.id = id;
  card.dataset.originalIndex = num - 1;
  
  card.innerHTML = `
    <input type="checkbox" class="select-check">
    <div class="page-thumb">
      <img src="${thumbUrl}" alt="Page ${num}">
    </div>
    <div class="page-info">
      <span>Page ${num}</span>
    </div>
    <div class="page-actions">
      <button class="action-btn delete" title="Delete Page">🗑️</button>
      <button class="action-btn" title="Rotate Page">🔄</button>
    </div>
  `;
  
  card.querySelector('.delete').addEventListener('click', () => card.remove());
  
  return card;
}

function initSortable() {
  Sortable.create(elements.pageGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost'
  });
}

// --- Actions ---

elements.btnSelectAll.addEventListener('click', () => {
  const checks = elements.pageGrid.querySelectorAll('.select-check');
  const allChecked = Array.from(checks).every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
  elements.btnSelectAll.textContent = allChecked ? 'Select All' : 'Deselect All';
});

elements.btnSave.addEventListener('click', () => processExport(false));
elements.btnExtract.addEventListener('click', () => processExport(true));

async function processExport(onlySelected) {
  const cards = Array.from(elements.pageGrid.children);
  const targetPages = cards
    .filter(card => !onlySelected || card.querySelector('.select-check').checked)
    .map(card => parseInt(card.dataset.originalIndex));
    
  if (targetPages.length === 0) {
    alert('No pages selected!');
    return;
  }

  const srcDoc = await PDFDocument.load(state.originalBuffer);
  const outDoc = await PDFDocument.create();
  
  const copiedPages = await outDoc.copyPages(srcDoc, targetPages);
  copiedPages.forEach(page => outDoc.addPage(page));
  
  const pdfBytes = await outDoc.save();
  saveAs(new Blob([pdfBytes]), onlySelected ? 'extracted_pages.pdf' : 'organized_document.pdf');
}
