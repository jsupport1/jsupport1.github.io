const { PDFDocument, rgb, StandardFonts } = PDFLib;

const state = {
  pdfDoc: null,
  originalBuffer: null,
  modifiedItems: [], // Text changes: { pageIndex, itemIdx, text, x, y, font, size, color, deleted, highlight }
  annotations: [],   // Non-text annotations: { type: 'draw'|'shape'|'note', pageIdx, data }
  currentMode: 'edit', 
  selectedElement: null,
  pdfjsDoc: null,
  scale: 1.5,
  isDrawing: false,
  currentPath: [],
  drawingColor: '#ff0000',
  drawingSize: 3,
  pendingSignature: null,
  pendingItem: null, // { type, content }
  contextClick: { x: 0, y: 0, pageIdx: 0 },
  signatureModal: document.getElementById('sign-modal'),
  sigCanvas: document.getElementById('sig-canvas'),
  sigCtx: document.getElementById('sig-canvas')?.getContext('2d')
};

const elements = {
  uploadScreen: document.getElementById('upload-screen'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  renderContainer: document.getElementById('pdf-render-container'),
  propertyBar: document.getElementById('property-bar'),
  fontFamily: document.getElementById('font-family'),
  fontSize: document.getElementById('font-size'),
  textColor: document.getElementById('text-color'),
  bgColor: document.getElementById('bg-color'),
  btnNoBg: document.getElementById('btn-no-bg'),
  saveBtn: document.getElementById('save-pdf'),
  modes: {
    edit: document.getElementById('mode-edit'),
    move: document.getElementById('mode-move'),
    delete: document.getElementById('mode-delete'),
    highlight: document.getElementById('mode-highlight'),
    draw: document.getElementById('mode-draw'),
    shape: document.getElementById('mode-shape'),
    arrow: document.getElementById('mode-arrow'),
    note: document.getElementById('mode-note')
  },
  addText: document.getElementById('add-text'),
  addName: document.getElementById('btn-add-name'),
  addDate: document.getElementById('btn-add-date'),
  alignLeft: document.getElementById('btn-align-left'),
  alignCenter: document.getElementById('btn-align-center'),
  alignRight: document.getElementById('btn-align-right'),
  contextMenu: document.getElementById('context-menu'),
  menuAddSign: document.getElementById('menu-add-sign'),
  menuAddName: document.getElementById('menu-add-name'),
  menuAddDate: document.getElementById('menu-add-date')
};

// --- Initialization ---

elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFileSelect);
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

function handleFileSelect(e) {
  if (e.target.files.length) handleFile(e.target.files[0]);
}

async function handleFile(file) {
  elements.uploadScreen.style.display = 'none';
  const arrayBuffer = await file.arrayBuffer();
  state.originalBuffer = arrayBuffer;
  
  // Load with PDF.js for rendering
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  state.pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  
  renderAllPages();
}

// --- Rendering ---

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
  
  const renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport: viewport
  };
  await page.render(renderContext).promise;
  
  // Text Overlay Layer
  const textLayer = document.createElement('div');
  textLayer.className = 'text-layer-overlay';
  pageWrapper.appendChild(textLayer);

  // Drawing Canvas Layer
  const drawCanvas = document.createElement('canvas');
  drawCanvas.width = viewport.width;
  drawCanvas.height = viewport.height;
  drawCanvas.style.position = 'absolute';
  drawCanvas.style.top = '0';
  drawCanvas.style.left = '0';
  drawCanvas.style.pointerEvents = 'none';
  pageWrapper.appendChild(drawCanvas);
  pageWrapper.drawCtx = drawCanvas.getContext('2d');
  
  // Interaction events for drawing/shapes
  pageWrapper.addEventListener('mousedown', (e) => handleWorkspaceMouseDown(e, pageWrapper));
  pageWrapper.addEventListener('mousemove', (e) => handleWorkspaceMouseMove(e, pageWrapper));
  pageWrapper.addEventListener('mouseup', (e) => handleWorkspaceMouseUp(e, pageWrapper));
  
  pageWrapper.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = pageWrapper.getBoundingClientRect();
    state.contextClick = { x: e.clientX - rect.left, y: e.clientY - rect.top, pageIdx: parseInt(pageWrapper.dataset.pageIndex) };
    if (elements.contextMenu) {
      elements.contextMenu.style.display = 'block';
      elements.contextMenu.style.left = `${e.clientX}px`;
      elements.contextMenu.style.top = `${e.clientY}px`;
    }
  });

  const textContent = await page.getTextContent();
  
  textContent.items.forEach((item, itemIdx) => {
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
    
    const div = document.createElement('div');
    div.className = 'text-block';
    div.textContent = item.str;
    div.style.left = `${tx[4]}px`;
    div.style.top = `${tx[5] - fontSize}px`; // Adjusting for top-down
    div.style.fontSize = `${fontSize}px`;
    div.style.fontFamily = item.fontName;
    div.style.transform = `scaleX(${item.width / fontSize / item.str.length || 1})`;
    
    // Store metadata
    div.dataset.pageIdx = pageNum - 1;
    div.dataset.itemIdx = itemIdx;
    div.dataset.originalX = tx[4];
    div.dataset.originalY = tx[5];
    div.dataset.originalSize = fontSize;
    div.dataset.originalStr = item.str;
    div.dataset.width = item.width;
    div.dataset.height = item.height;

    setupItemInteractions(div);
    textLayer.appendChild(div);
  });
  
  elements.renderContainer.appendChild(pageWrapper);
}

// --- Interactions ---

function setupItemInteractions(div) {
  div.addEventListener('mousedown', (e) => {
    if (state.currentMode === 'move') {
      startMoving(e, div);
    } else if (state.currentMode === 'delete') {
      div.remove();
      registerChange(div, true);
    } else if (state.currentMode === 'highlight') {
      div.style.background = 'rgba(255, 255, 0, 0.4)';
      div.dataset.highlight = 'true';
      registerChange(div);
    } else if (state.currentMode === 'edit') {
      selectItem(div);
    }
    e.stopPropagation();
  });

  div.addEventListener('blur', () => {
    if (div.contentEditable === 'true') {
      div.contentEditable = 'false';
      registerChange(div);
    }
  });

  div.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && div.contentEditable === 'true') {
      div.contentEditable = 'false';
      div.blur();
      registerChange(div);
      e.preventDefault();
    }
    if (e.key === 'Enter' && !e.shiftKey && div.contentEditable === 'true') {
        div.contentEditable = 'false';
        div.blur();
        registerChange(div);
        e.preventDefault();
    }
  });
}

function selectItem(div) {
  if (state.selectedElement) state.selectedElement.classList.remove('selected');
  state.selectedElement = div;
  div.classList.add('selected');
  
  elements.propertyBar.classList.add('active');
  elements.fontSize.value = Math.round(parseFloat(div.style.fontSize)) || 12;
  
  div.contentEditable = 'true';
  
  // Sync property bar
  elements.fontFamily.value = div.style.fontFamily.replace(/['"]/g, '') || 'Helvetica';
  elements.textColor.value = rgbToHex(div.style.color);
  elements.bgColor.value = div.style.backgroundColor === 'transparent' ? '#ffffff' : rgbToHex(div.style.backgroundColor);
}

function rgbToHex(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent') return '#ffffff';
  const rgb = rgbStr.match(/\d+/g);
  if (!rgb) return '#ffffff';
  return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
}

function startMoving(e, div) {
  let startX = e.clientX;
  let startY = e.clientY;
  let startLeft = parseFloat(div.style.left);
  let startTop = parseFloat(div.style.top);
  
  function onMove(e) {
    div.style.left = `${startLeft + (e.clientX - startX)}px`;
    div.style.top = `${startTop + (e.clientY - startY)}px`;
  }
  
  function onUp(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    
    // Multi-page detection
    const wrappers = document.querySelectorAll('.page-wrapper');
    let targetWrapper = null;
    wrappers.forEach(w => {
      const rect = w.getBoundingClientRect();
      if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
          ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        targetWrapper = w;
      }
    });
    
    if (targetWrapper && targetWrapper !== div.closest('.page-wrapper')) {
      const newLayer = targetWrapper.querySelector('.text-layer-overlay');
      const oldRect = div.getBoundingClientRect();
      newLayer.appendChild(div);
      const newRect = newLayer.getBoundingClientRect();
      div.style.left = `${oldRect.left - newRect.left}px`;
      div.style.top = `${oldRect.top - newRect.top}px`;
      div.dataset.pageIdx = targetWrapper.dataset.pageIndex;
    }
    
    registerChange(div);
  }
  
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function registerChange(div, isDeleted = false) {
  const pageIdx = parseInt(div.dataset.pageIdx);
  const itemIdx = div.dataset.itemIdx; 
  
  const change = {
    pageIdx,
    itemIdx,
    text: div.textContent,
    x: parseFloat(div.style.left),
    y: parseFloat(div.style.top),
    fontSize: parseFloat(div.style.fontSize),
    color: div.style.color || '', 
    bgColor: div.style.backgroundColor || 'transparent',
    font: div.style.fontFamily.replace(/['"]/g, '') || '',
    deleted: isDeleted,
    highlight: div.dataset.highlight === 'true',
    isNew: div.dataset.isNew === 'true',
    isNote: div.dataset.isNote === 'true',
    isSignature: div.dataset.isSignature === 'true',
    sigContent: div.dataset.sigContent,
    originalX: parseFloat(div.dataset.originalX),
    originalY: parseFloat(div.dataset.originalY),
    originalWidth: parseFloat(div.dataset.width),
    originalHeight: parseFloat(div.dataset.height)
  };
  
  // Update or add: Find by itemIdx globally since an item might have moved pages
  const existingIdx = state.modifiedItems.findIndex(m => m.itemIdx == itemIdx);
  if (existingIdx > -1) {
    state.modifiedItems[existingIdx] = change;
  } else {
    state.modifiedItems.push(change);
  }
}

// --- Workspace Wide Interactions (Draw/Shapes) ---

function handleWorkspaceMouseDown(e, wrapper) {
  const rect = wrapper.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (state.currentMode === 'draw') {
    state.isDrawing = true;
    state.currentPath = [{ x, y }];
  } else if (state.currentMode === 'shape' || state.currentMode === 'arrow') {
    state.isDrawing = true;
    state.currentPath = [{ x, y }]; // Start point
  } else if (state.currentMode === 'note') {
    addStickyNote(e, wrapper);
  }
}

function handleWorkspaceMouseMove(e, wrapper) {
  if (!state.isDrawing) return;
  
  const rect = wrapper.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ctx = wrapper.drawCtx;

  if (state.currentMode === 'draw') {
    state.currentPath.push({ x, y });
    ctx.strokeStyle = state.drawingColor;
    ctx.lineWidth = state.drawingSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const prev = state.currentPath[state.currentPath.length - 2];
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (state.currentMode === 'shape' || state.currentMode === 'arrow') {
    state.currentPath[1] = { x, y };
    redrawAnnotations(wrapper);
  }
}

function redrawAnnotations(wrapper) {
    const ctx = wrapper.drawCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw existing annotations
    state.annotations.forEach(annot => {
        if (annot.pageIdx !== parseInt(wrapper.dataset.pageIndex)) return;
        drawAnnotation(ctx, annot);
    });
    
    // Draw current drag
    if (state.isDrawing) {
        if (state.currentMode === 'shape') {
            const start = state.currentPath[0];
            const end = state.currentPath[1] || start;
            ctx.strokeStyle = state.drawingColor;
            ctx.strokeRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(start.x - end.x), Math.abs(start.y - end.y));
        } else if (state.currentMode === 'arrow') {
            const start = state.currentPath[0];
            const end = state.currentPath[1] || start;
            drawArrow(ctx, start.x, start.y, end.x, end.y, state.drawingColor);
        }
    }
}

function drawAnnotation(ctx, annot) {
    ctx.strokeStyle = annot.color;
    ctx.lineWidth = annot.size || 2;
    if (annot.type === 'draw') {
        ctx.beginPath();
        ctx.moveTo(annot.path[0].x, annot.path[0].y);
        annot.path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    } else if (annot.type === 'shape') {
        ctx.strokeRect(annot.x, annot.y, annot.w, annot.h);
    } else if (annot.type === 'arrow') {
        drawArrow(ctx, annot.x1, annot.y1, annot.x2, annot.y2, annot.color);
    }
}

function handleWorkspaceMouseUp(e, wrapper) {
  if (state.isDrawing) {
    state.isDrawing = false;
    const pageIdx = parseInt(wrapper.dataset.pageIndex);
    if (state.currentMode === 'draw') {
        state.annotations.push({
            type: 'draw',
            pageIdx: pageIdx,
            path: [...state.currentPath],
            color: state.drawingColor,
            size: state.drawingSize
        });
    } else if (state.currentMode === 'shape') {
        const start = state.currentPath[0];
        const end = state.currentPath[1] || start;
        state.annotations.push({
            type: 'shape',
            pageIdx: pageIdx,
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x),
            h: Math.abs(start.y - end.y),
            color: state.drawingColor
        });
    } else if (state.currentMode === 'arrow') {
        const start = state.currentPath[0];
        const end = state.currentPath[1] || start;
        state.annotations.push({
            type: 'arrow',
            pageIdx: pageIdx,
            x1: start.x, y1: start.y, x2: end.x, y2: end.y,
            color: state.drawingColor
        });
    }
    redrawAnnotations(wrapper);
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
    const headlen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function addStickyNote(e, wrapper) {
  const rect = wrapper.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'text-block';
  div.textContent = 'Sticky Note';
  div.style.left = `${e.clientX - rect.left}px`;
  div.style.top = `${e.clientY - rect.top}px`;
  div.style.fontSize = '14px';
  div.style.background = '#fff59d';
  div.style.color = '#333';
  div.style.padding = '5px';
  div.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
  div.dataset.pageIdx = wrapper.dataset.pageIndex;
  div.dataset.itemIdx = Date.now();
  div.dataset.isNew = 'true';
  div.dataset.isNote = 'true';
  
  setupItemInteractions(div);
  wrapper.querySelector('.text-layer-overlay').appendChild(div);
  selectItem(div);
  registerChange(div);
}

// --- Toolbar Events ---

Object.keys(elements.modes).forEach(mode => {
  elements.modes[mode].addEventListener('click', () => {
    state.currentMode = mode;
    Object.values(elements.modes).forEach(b => b.classList.remove('active'));
    elements.modes[mode].classList.add('active');
    
    // Toggle pointer events on canvases
    document.querySelectorAll('.page-wrapper canvas').forEach((canv, idx) => {
        // Skip the first canvas (PDF render)
        if (canv.style.position === 'absolute') {
            canv.style.pointerEvents = (mode === 'draw' || mode === 'shape') ? 'all' : 'none';
        }
    });
  });
});

elements.fontFamily.addEventListener('change', () => {
  if (state.selectedElement) {
    state.selectedElement.style.fontFamily = elements.fontFamily.value;
    registerChange(state.selectedElement);
  }
});

elements.fontSize.addEventListener('input', () => {
  if (state.selectedElement) {
    state.selectedElement.style.fontSize = `${elements.fontSize.value}px`;
    registerChange(state.selectedElement);
  }
});

elements.textColor.addEventListener('input', () => {
  if (state.selectedElement) {
    state.selectedElement.style.color = elements.textColor.value;
    registerChange(state.selectedElement);
  }
});

elements.bgColor.addEventListener('input', () => {
  if (state.selectedElement) {
    state.selectedElement.style.backgroundColor = elements.bgColor.value;
    registerChange(state.selectedElement);
  }
});

elements.btnNoBg.addEventListener('click', () => {
  if (state.selectedElement) {
    state.selectedElement.style.backgroundColor = 'transparent';
    registerChange(state.selectedElement);
  }
});

// Placement preview logic
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
  
  const moveGhost = (e) => {
    if (!state.pendingSignature && !state.pendingItem) { ghost.remove(); document.removeEventListener('mousemove', moveGhost); return; }
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
  };
  document.addEventListener('mousemove', moveGhost);
}

function preparePlacement(type, content) {
  state.pendingItem = { type, content };
  startPlacementPreview(content, type === 'image');
  document.body.style.cursor = 'crosshair';
}

elements.addText?.addEventListener('click', () => preparePlacement('text', 'New Text'));
elements.addName?.addEventListener('click', () => preparePlacement('text', 'Your Name'));
elements.addDate?.addEventListener('click', () => preparePlacement('text', new Date().toLocaleDateString()));

elements.alignLeft?.addEventListener('click', () => alignSelected('left'));
elements.alignCenter?.addEventListener('click', () => alignSelected('center'));
elements.alignRight?.addEventListener('click', () => alignSelected('right'));

function alignSelected(type) {
  if (!state.selectedElement) return;
  const parent = state.selectedElement.parentElement;
  const pw = parent.clientWidth, ew = state.selectedElement.offsetWidth;
  if (type === 'left') state.selectedElement.style.left = '0px';
  if (type === 'center') state.selectedElement.style.left = `${(pw - ew) / 2}px`;
  if (type === 'right') state.selectedElement.style.left = `${pw - ew}px`;
  registerChange(state.selectedElement);
}

function addTextAt(content, x, y, pageIdx) {
  const wrappers = document.querySelectorAll('.page-wrapper');
  const targetWrapper = wrappers[pageIdx];
  if (!targetWrapper) return;

  const div = document.createElement('div');
  div.className = 'text-block';
  div.textContent = content;
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.fontSize = '20px';
  div.style.color = elements.textColor.value;
  div.style.fontFamily = elements.fontFamily.value;
  div.style.backgroundColor = 'transparent';
  div.dataset.pageIdx = pageIdx;
  div.dataset.itemIdx = Date.now();
  div.dataset.isNew = 'true';

  setupItemInteractions(div);
  targetWrapper.querySelector('.text-layer-overlay').appendChild(div);
  selectItem(div);
  registerChange(div);
}

function addSignatureAt(dataUrl, x, y, pageIdx) {
  const wrappers = document.querySelectorAll('.page-wrapper');
  const targetWrapper = wrappers[pageIdx];
  if (!targetWrapper) return;

  const div = document.createElement('div');
  div.className = 'text-block';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.width = '150px';
  div.appendChild(img);
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.backgroundColor = 'transparent';
  div.style.border = '1px dashed #ccc'; // Added dashed border for visibility while editing
  
  div.dataset.pageIdx = pageIdx;
  div.dataset.itemIdx = Date.now();
  div.dataset.isNew = 'true';
  div.dataset.isSignature = 'true';
  div.dataset.sigContent = dataUrl;
  
  setupItemInteractions(div);
  targetWrapper.querySelector('.text-layer-overlay').appendChild(div);
  registerChange(div);
}

// Menu actions
elements.menuAddSign?.addEventListener('click', () => { elements.signatureModal.style.display = 'flex'; initSignatureCanvas(); });
elements.menuAddName?.addEventListener('click', () => addTextAt('Your Name', state.contextClick.x, state.contextClick.y, state.contextClick.pageIdx));
elements.menuAddDate?.addEventListener('click', () => addTextAt(new Date().toLocaleDateString(), state.contextClick.x, state.contextClick.y, state.contextClick.pageIdx));

window.addEventListener('click', () => { if (elements.contextMenu) elements.contextMenu.style.display = 'none'; });

// --- Signature Tool ---

const signBtn = document.getElementById('btn-draw-sign');
const sigClear = document.getElementById('sig-clear');
const sigSave = document.getElementById('sig-save');
const sigCancel = document.getElementById('sig-cancel');

if (signBtn) {
  signBtn.addEventListener('click', () => {
    state.signatureModal.style.display = 'flex';
    initSignatureCanvas();
  });
}

function initSignatureCanvas() {
  const canvas = state.sigCanvas;
  const ctx = state.sigCtx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  let drawing = false;
  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  
  canvas.onmousedown = (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  window.addEventListener('mousemove', (e) => { if(!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  window.addEventListener('mouseup', () => { drawing = false; });
}

sigClear?.addEventListener('click', () => {
  state.sigCtx.clearRect(0, 0, state.sigCanvas.width, state.sigCanvas.height);
});

sigCancel?.addEventListener('click', () => {
  state.signatureModal.style.display = 'none';
});

sigSave?.addEventListener('click', () => {
  const dataUrl = state.sigCanvas.toDataURL();
  state.pendingSignature = dataUrl;
  state.signatureModal.style.display = 'none';
  document.body.style.cursor = 'crosshair';
  
  // Ghost follow
  const ghost = document.createElement('img');
  ghost.src = dataUrl;
  ghost.style.cssText = 'position:fixed; pointer-events:none; z-index:5000; opacity:0.6; width:150px; border:1px dashed var(--v);';
  document.body.appendChild(ghost);
  
  const moveGhost = (e) => {
    if (!state.pendingSignature) { ghost.remove(); document.removeEventListener('mousemove', moveGhost); return; }
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
  };
  document.addEventListener('mousemove', moveGhost);
});

// Workspace click for signature and item placement
elements.renderContainer.addEventListener('click', (e) => {
  if (state.pendingSignature || state.pendingItem) {
    const wrappers = document.querySelectorAll('.page-wrapper');
    let targetWrapper = null;
    let pageIdx = 0;
    
    wrappers.forEach((w, i) => {
      const r = w.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        targetWrapper = w;
        pageIdx = i;
      }
    });

    if (targetWrapper) {
      const rect = targetWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (state.pendingSignature) {
        addSignatureAt(state.pendingSignature, x, y, pageIdx);
        state.pendingSignature = null;
      } else if (state.pendingItem) {
        addTextAt(state.pendingItem.content, x, y, pageIdx);
        state.pendingItem = null;
      }
      
      document.body.style.cursor = 'default';
      if (state.ghostElement) state.ghostElement.remove();
    }
  }
});

// --- Toolbar Events ---

elements.saveBtn.addEventListener('click', async () => {
  const pdfDoc = await PDFDocument.load(state.originalBuffer);
  const pages = pdfDoc.getPages();
  
  const standardFonts = {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier)
  };

  for (const change of state.modifiedItems) {
    const page = pages[change.pageIdx];
    const { height } = page.getSize();
    
    // 1. Hide original text (if not a new item)
    if (!change.isNew) {
        const origX = change.originalX / state.scale;
        const origY = height - (change.originalY / state.scale);
        const origW = change.originalWidth / state.scale;
        const origH = change.originalHeight / state.scale || change.fontSize / state.scale;

        page.drawRectangle({
            x: origX,
            y: origY - origH,
            width: origW + 2,
            height: origH + 2,
            color: rgb(1, 1, 1), 
        });
    }

    // 2. Draw Highlight
    if (change.highlight) {
        const hX = change.x / state.scale;
        const hY = height - ((change.y + change.fontSize) / state.scale);
        page.drawRectangle({
            x: hX,
            y: hY,
            width: (change.originalWidth || 50) / state.scale,
            height: change.fontSize / state.scale,
            color: rgb(1, 1, 0),
            opacity: 0.4
        });
    }

    // 3. Draw new text / Note / Signature (if not deleted)
    if (!change.deleted) {
        if (change.isSignature) {
            const sigX = change.x / state.scale;
            const sigY = height - ((change.y + 70) / state.scale);
            const sigImg = await pdfDoc.embedPng(change.sigContent);
            page.drawImage(sigImg, {
                x: sigX,
                y: sigY,
                width: 150 / state.scale,
                height: 70 / state.scale
            });
        } else {
            const newX = change.x / state.scale;
            const newY = height - ((change.y + change.fontSize) / state.scale);
            const font = standardFonts[change.font] || standardFonts['Helvetica'];
            const colorStr = change.color || (change.isNew ? elements.textColor.value : '#000000');
            const color = hexToRgb(colorStr);
            const bgColor = change.bgColor !== 'transparent' ? hexToRgb(change.bgColor) : (change.isNote ? {r:255, g:245, b:157} : null);

            if (bgColor) {
                const textWidth = font.widthOfTextAtSize(change.text || " ", change.fontSize / state.scale);
                page.drawRectangle({
                    x: newX - 2,
                    y: newY - 2,
                    width: (change.isNote ? 100 : textWidth + 4),
                    height: change.fontSize / state.scale + 4,
                    color: rgb(bgColor.r/255, bgColor.g/255, bgColor.b/255),
                });
            }

            page.drawText(change.text || "", {
                x: newX,
                y: newY,
                size: change.fontSize / state.scale,
                font: font,
                color: rgb(color.r/255, color.g/255, color.b/255),
            });
        }
    }
  }

  // 4. Draw Freehand Annotations
  for (const annot of state.annotations) {
    if (annot.type === 'draw') {
        const page = pages[annot.pageIdx];
        const { height } = page.getSize();
        const color = hexToRgb(annot.color);
        
        for (let i = 1; i < annot.path.length; i++) {
            const p1 = annot.path[i-1];
            const p2 = annot.path[i];
            page.drawLine({
                start: { x: p1.x / state.scale, y: height - (p1.y / state.scale) },
                end: { x: p2.x / state.scale, y: height - (p2.y / state.scale) },
                thickness: annot.size / state.scale,
                color: rgb(color.r/255, color.g/255, color.b/255)
            });
        }
    } else if (annot.type === 'shape') {
        const page = pages[annot.pageIdx];
        const { height } = page.getSize();
        const color = hexToRgb(annot.color);
        page.drawRectangle({
            x: annot.x / state.scale,
            y: height - ((annot.y + annot.h) / state.scale),
            width: annot.w / state.scale,
            height: annot.h / state.scale,
            borderColor: rgb(color.r/255, color.g/255, color.b/255),
            borderWidth: 2
        });
    } else if (annot.type === 'arrow') {
        const page = pages[annot.pageIdx];
        const { height } = page.getSize();
        const color = hexToRgb(annot.color);
        const x1 = annot.x1 / state.scale, y1 = height - (annot.y1 / state.scale);
        const x2 = annot.x2 / state.scale, y2 = height - (annot.y2 / state.scale);
        
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 2, color: rgb(color.r/255, color.g/255, color.b/255) });
        // Draw simple arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headlen = 5;
        page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 - headlen * Math.cos(angle - Math.PI / 6), y: y2 - headlen * Math.sin(angle - Math.PI / 6) }, thickness: 2, color: rgb(color.r/255, color.g/255, color.b/255) });
        page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 - headlen * Math.cos(angle + Math.PI / 6), y: y2 - headlen * Math.sin(angle + Math.PI / 6) }, thickness: 2, color: rgb(color.r/255, color.g/255, color.b/255) });
    }
  }

  const pdfBytes = await pdfDoc.save();
  saveAs(new Blob([pdfBytes]), 'edited_document.pdf');
});

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
