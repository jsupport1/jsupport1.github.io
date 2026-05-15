// Use a more robust way to access PDFLib, matching other tools in the project
const { PDFDocument, rgb, StandardFonts } = typeof PDFLib !== 'undefined' ? PDFLib : (window.PDFLib || {});

const state = {
  originalBuffer: null,
  pdfjsDoc: null,
  pdfLibDoc: null,
  scale: 1.5,
  signItems: [], // { type: 'text'|'image', pageIdx, x, y, content, w, h }
  formFieldValues: {}, // { fieldName: value }
  isSigning: false,
  pendingItem: null, // { type, content } for click-to-place
  contextClick: { x: 0, y: 0, pageIdx: 0 }, // For menu placement
  isContextAdd: false
};

let elements = {};

document.addEventListener('DOMContentLoaded', () => {
  elements = {
    uploadScreen: document.getElementById('upload-screen'),
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    renderContainer: document.getElementById('pdf-render-container'),
    exportBtn: document.getElementById('export-pdf'),
    exportBtnTop: document.getElementById('export-pdf-top'),
    
    btnDrawSign: document.getElementById('btn-draw-sign'),
    btnUploadSign: document.getElementById('btn-upload-sign'),
    btnName: document.getElementById('btn-add-name'),
    btnDate: document.getElementById('btn-add-date'),
    btnText: document.getElementById('btn-add-text'),
    btnDetect: document.getElementById('btn-detect-fields'),
    btnAlignLeft: document.getElementById('btn-align-left'),
    btnAlignCenter: document.getElementById('btn-align-center'),
    btnAlignRight: document.getElementById('btn-align-right'),
    
    signModal: document.getElementById('sign-modal'),
    sigCanvas: document.getElementById('sig-canvas'),
    sigClear: document.getElementById('sig-clear'),
    sigSave: document.getElementById('sig-save'),
    sigCancel: document.getElementById('sig-cancel'),
    signImgInput: document.getElementById('sign-img-input'),
    contextMenu: document.getElementById('context-menu'),
    menuAddSign: document.getElementById('menu-add-sign'),
    menuAddName: document.getElementById('menu-add-name'),
    menuAddDate: document.getElementById('menu-add-date')
  };

  initApp();
});

function initApp() {
  if (elements.dropZone) {
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    elements.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropZone.classList.add('dragover');
    });
    elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragover'));
    elements.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
  }

  // Toolbar events with safety checks
  elements.btnUploadSign?.addEventListener('click', () => elements.signImgInput.click());
  elements.signImgInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addSignImage(ev.target.result);
    reader.readAsDataURL(file);
  });

  elements.btnName?.addEventListener('click', () => preparePlacement('text', 'Your Name'));
  elements.btnDate?.addEventListener('click', () => preparePlacement('text', new Date().toLocaleDateString()));
  elements.btnText?.addEventListener('click', () => preparePlacement('text', 'New Text'));

  elements.btnName?.addEventListener('dragstart', (e) => e.dataTransfer.setData('application/pdf-tool', JSON.stringify({ type: 'text', content: 'Your Name' })));
  elements.btnDate?.addEventListener('dragstart', (e) => e.dataTransfer.setData('application/pdf-tool', JSON.stringify({ type: 'text', content: new Date().toLocaleDateString() })));
  elements.btnText?.addEventListener('dragstart', (e) => e.dataTransfer.setData('application/pdf-tool', JSON.stringify({ type: 'text', content: 'New Text' })));

  elements.btnDrawSign?.addEventListener('click', () => {
    elements.signModal.style.display = 'flex';
    state.isContextAdd = false;
    initSigPad();
  });

  elements.exportBtn?.addEventListener('click', () => processExport());
  elements.exportBtnTop?.addEventListener('click', () => processExport());
  
  elements.btnAlignLeft?.addEventListener('click', () => alignSelected('left'));
  elements.btnAlignCenter?.addEventListener('click', () => alignSelected('center'));
  elements.btnAlignRight?.addEventListener('click', () => alignSelected('right'));

  // Menu actions
  elements.menuAddSign?.addEventListener('click', () => { elements.signModal.style.display = 'flex'; state.isContextAdd = true; initSigPad(); });
  elements.menuAddName?.addEventListener('click', () => createDraggable({ type: 'text', content: 'Your Name', x: state.contextClick.x, y: state.contextClick.y, pageIdx: state.contextClick.pageIdx }));
  elements.menuAddDate?.addEventListener('click', () => createDraggable({ type: 'text', content: new Date().toLocaleDateString(), x: state.contextClick.x, y: state.contextClick.y, pageIdx: state.contextClick.pageIdx }));

  window.addEventListener('click', () => { if (elements.contextMenu) elements.contextMenu.style.display = 'none'; });
}

function preparePlacement(type, content) {
  state.pendingItem = { type, content };
  startPlacementPreview(content, type === 'image');
}

async function handleFile(file) {
  if (!file) return;
  
  // Show loading state if needed (optional, but good for UX)
  if (elements.uploadScreen) elements.uploadScreen.style.display = 'none';
  elements.renderContainer.innerHTML = '<div style="color: white; text-align: center; padding: 40px;">Loading PDF...</div>';
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    state.originalBuffer = arrayBuffer;
    
    // Ensure PDF.js is ready
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF rendering library (pdf.js) not loaded. Please check your internet connection.");
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Load with PDF.js for rendering preview
    // We use a copy (slice) because PDF.js might detach the buffer
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    state.pdfjsDoc = await loadingTask.promise;
    
    // Verify PDF-Lib is also available for signing later
    if (typeof PDFDocument === 'undefined') {
      throw new Error("PDF signing library (pdf-lib) not loaded. Please check your internet connection.");
    }
    
    // Load with PDF-Lib using the original buffer
    state.pdfLibDoc = await PDFDocument.load(arrayBuffer);
    
    await renderAllPages();
  } catch (err) {
    console.error("Detailed PDF Load Error:", err);
    elements.renderContainer.innerHTML = '';
    if (elements.uploadScreen) elements.uploadScreen.style.display = 'flex';
    
    let errorMsg = "Failed to load PDF. ";
    if (err.name === 'PasswordException') {
      errorMsg += "This PDF is password protected. Please remove the password and try again.";
    } else {
      errorMsg += "Please try another file or check if it's a valid PDF document.";
    }
    
    alert(errorMsg);
  }
}

async function renderAllPages() {
  elements.renderContainer.innerHTML = '';
  for (let i = 1; i <= state.pdfjsDoc.numPages; i++) {
    await renderPage(i);
  }
}

async function renderPage(pageNum) {
  const page = await state.pdfjsDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: state.scale });
  
  const pageWrapper = document.createElement('div');
  pageWrapper.className = 'page-wrapper';
  pageWrapper.style.width = `${viewport.width}px`;
  pageWrapper.style.height = `${viewport.height}px`;
  pageWrapper.dataset.pageIndex = pageNum - 1;
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  pageWrapper.appendChild(canvas);
  
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  
  const interactionLayer = document.createElement('div');
  interactionLayer.className = 'interaction-layer';
  interactionLayer.style.position = 'absolute';
  interactionLayer.style.inset = '0';
  interactionLayer.style.zIndex = '10';
  
  interactionLayer.addEventListener('dragover', (e) => e.preventDefault());
  interactionLayer.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer.getData('application/pdf-tool');
    if (!dt) return;
    const data = JSON.parse(dt);
    const rect = interactionLayer.getBoundingClientRect();
    createDraggable({ ...data, x: e.clientX - rect.left, y: e.clientY - rect.top, pageIdx: parseInt(pageWrapper.dataset.pageIndex) });
  });
  
  interactionLayer.addEventListener('click', (e) => {
    if (state.pendingItem) {
      const rect = interactionLayer.getBoundingClientRect();
      createDraggable({ ...state.pendingItem, x: e.clientX - rect.left, y: e.clientY - rect.top, pageIdx: parseInt(pageWrapper.dataset.pageIndex) });
      state.pendingItem = null;
      document.body.classList.remove('placing-item');
      if (state.ghostElement) state.ghostElement.remove();
    }
  });

  interactionLayer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = interactionLayer.getBoundingClientRect();
    state.contextClick = { x: e.clientX - rect.left, y: e.clientY - rect.top, pageIdx: parseInt(pageWrapper.dataset.pageIndex) };
    if (elements.contextMenu) {
      elements.contextMenu.style.display = 'block';
      elements.contextMenu.style.left = `${e.clientX}px`;
      elements.contextMenu.style.top = `${e.clientY}px`;
    }
  });
  
  pageWrapper.appendChild(interactionLayer);
  elements.renderContainer.appendChild(pageWrapper);
}

function initSigPad() {
  const canvas = elements.sigCanvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  let drawing = false;
  canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); };
  canvas.onmousemove = (e) => { if(!drawing) return; const r = canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); };
  canvas.onmouseup = () => drawing = false;
  
  elements.sigClear.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  elements.sigCancel.onclick = () => elements.signModal.style.display = 'none';
  elements.sigSave.onclick = () => {
    const dataUrl = canvas.toDataURL();
    elements.signModal.style.display = 'none';
    if (state.isContextAdd) {
      createDraggable({ type: 'image', content: dataUrl, x: state.contextClick.x, y: state.contextClick.y, pageIdx: state.contextClick.pageIdx });
    } else {
      addSignImage(dataUrl);
    }
  };
}

function addSignImage(dataUrl) {
  state.pendingItem = { type: 'image', content: dataUrl };
  startPlacementPreview(dataUrl, true);
}

function startPlacementPreview(content, isImage) {
  if (state.ghostElement) state.ghostElement.remove();
  const ghost = document.createElement('div');
  ghost.style.cssText = 'position:fixed; pointer-events:none; z-index:5000; opacity:0.6; border:1px dashed var(--v);';
  if (isImage) {
    const img = document.createElement('img');
    img.src = content; img.style.width = '150px'; ghost.appendChild(img);
  } else {
    ghost.textContent = content; ghost.style.background = 'white'; ghost.style.padding = '5px';
  }
  document.body.appendChild(ghost);
  state.ghostElement = ghost;
  document.body.classList.add('placing-item');
  const moveGhost = (e) => { if (!state.pendingItem) { document.removeEventListener('mousemove', moveGhost); return; } ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; };
  document.addEventListener('mousemove', moveGhost);
}

function createDraggable(item) {
  const div = document.createElement('div');
  div.className = 'sign-item';
  div.style.left = `${item.x}px`;
  div.style.top = `${item.y}px`;
  
  if (item.type === 'image') {
    const img = document.createElement('img');
    img.src = item.content; img.style.width = '150px'; div.appendChild(img);
  } else {
    div.textContent = item.content; div.contentEditable = 'true';
    div.style.cssText += 'font-size:18px; color:black; background:rgba(255,255,255,0.4); padding:2px 8px; border-radius:4px;';
  }
  
  const delBtn = document.createElement('div');
  delBtn.innerHTML = '×';
  delBtn.style.cssText = 'position:absolute; top:-10px; right:-10px; width:20px; height:20px; background:red; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; display:none;';
  div.appendChild(delBtn);
  div.addEventListener('mouseenter', () => delBtn.style.display = 'flex');
  div.addEventListener('mouseleave', () => delBtn.style.display = 'none');
  delBtn.onclick = (e) => { e.stopPropagation(); div.remove(); state.signItems = state.signItems.filter(i => i.element !== div); };
  
  let startX, startY;
  div.onmousedown = (e) => {
    state.selectedElement = div;
    document.querySelectorAll('.sign-item').forEach(i => i.classList.remove('selected'));
    div.classList.add('selected');
    startX = e.clientX - div.offsetLeft;
    startY = e.clientY - div.offsetTop;
    const move = (ev) => { div.style.left = `${ev.clientX - startX}px`; div.style.top = `${ev.clientY - startY}px`; };
    const up = (ev) => {
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
      const wrappers = document.querySelectorAll('.page-wrapper');
      let targetWrapper = null;
      wrappers.forEach(w => { const rect = w.getBoundingClientRect(); if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) targetWrapper = w; });
      if (targetWrapper && targetWrapper !== div.parentElement.parentElement) {
        const newLayer = targetWrapper.querySelector('.interaction-layer'); const oldRect = div.getBoundingClientRect();
        newLayer.appendChild(div); const newRect = newLayer.getBoundingClientRect();
        div.style.left = `${oldRect.left - newRect.left}px`; div.style.top = `${oldRect.top - newRect.top}px`;
        item.pageIdx = parseInt(targetWrapper.dataset.pageIndex);
      }
    };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    e.stopPropagation();
  };
  
  const targetLayer = elements.renderContainer.children[item.pageIdx].querySelector('.interaction-layer');
  targetLayer.appendChild(div);
  state.signItems.push({ item, element: div });
}

function alignSelected(type) {
  if (!state.selectedElement) return;
  const parent = state.selectedElement.parentElement;
  const pw = parent.clientWidth, ew = state.selectedElement.offsetWidth;
  if (type === 'left') state.selectedElement.style.left = '0px';
  if (type === 'center') state.selectedElement.style.left = `${(pw - ew) / 2}px`;
  if (type === 'right') state.selectedElement.style.left = `${pw - ew}px`;
}

async function processExport() {
  const pdfDoc = await PDFDocument.load(state.originalBuffer);
  const pages = pdfDoc.getPages();
  for (const entry of state.signItems) {
    const { item, element } = entry;
    const page = pages[item.pageIdx];
    const { height } = page.getSize();
    const ew = element.offsetWidth / state.scale, eh = element.offsetHeight / state.scale;
    const x = parseFloat(element.style.left) / state.scale, y = height - (parseFloat(element.style.top) / state.scale + eh);
    if (item.type === 'image') {
      const img = await pdfDoc.embedPng(item.content);
      page.drawImage(img, { x, y, width: ew, height: eh });
    } else {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(element.textContent, { x, y: y + 2, size: 14, font, color: rgb(0,0,0) });
    }
  }
  const pdfBytes = await pdfDoc.save();
  saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'signed_document.pdf');
}
