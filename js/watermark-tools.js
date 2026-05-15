const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

const state = {
  originalBuffer: null,
  scale: 1.0,
  wmType: 'text', // 'text', 'image'
  wmText: 'CONFIDENTIAL',
  wmImage: null,
  wmOpacity: 0.3,
  wmRotate: -45,
  wmPosition: 'center'
};

const elements = {
  uploadScreen: document.getElementById('upload-screen'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  renderContainer: document.getElementById('pdf-render-container'),
  
  typeToggles: document.querySelectorAll('#type-toggle .radio-btn'),
  textControls: document.getElementById('text-controls'),
  imageControls: document.getElementById('image-controls'),
  
  wmText: document.getElementById('wm-text'),
  wmOpacity: document.getElementById('wm-opacity'),
  wmRotate: document.getElementById('wm-rotate'),
  wmPosition: document.getElementById('wm-position'),
  imgInput: document.getElementById('img-input'),
  
  opacityVal: document.getElementById('opacity-val'),
  rotateVal: document.getElementById('rotate-val'),
  applyBtn: document.getElementById('apply-watermark')
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
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const page = await pdf.getPage(1);
  
  renderPreview(page);
}

async function renderPreview(page) {
  const viewport = page.getViewport({ scale: 1.0 });
  elements.renderContainer.innerHTML = '';
  
  const pageWrapper = document.createElement('div');
  pageWrapper.className = 'page-wrapper';
  pageWrapper.style.width = `${viewport.width}px`;
  pageWrapper.style.height = `${viewport.height}px`;
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  pageWrapper.appendChild(canvas);
  
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  
  const overlay = document.createElement('div');
  overlay.id = 'watermark-overlay';
  pageWrapper.appendChild(overlay);
  
  elements.renderContainer.appendChild(pageWrapper);
  updatePreview();
}

// --- UI Updates ---

elements.typeToggles.forEach(btn => {
  btn.addEventListener('click', () => {
    state.wmType = btn.dataset.type;
    elements.typeToggles.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    elements.textControls.style.display = state.wmType === 'text' ? 'flex' : 'none';
    elements.imageControls.style.display = state.wmType === 'image' ? 'flex' : 'none';
    updatePreview();
  });
});

elements.wmText.addEventListener('input', (e) => { state.wmText = e.target.value; updatePreview(); });
elements.wmOpacity.addEventListener('input', (e) => { 
  state.wmOpacity = e.target.value / 100; 
  elements.opacityVal.textContent = e.target.value;
  updatePreview(); 
});
elements.wmRotate.addEventListener('input', (e) => { 
  state.wmRotate = parseInt(e.target.value); 
  elements.rotateVal.textContent = e.target.value;
  updatePreview(); 
});
elements.wmPosition.addEventListener('change', (e) => { state.wmPosition = e.target.value; updatePreview(); });

elements.imgInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.wmImage = ev.target.result;
    updatePreview();
  };
  reader.readAsDataURL(file);
});

function updatePreview() {
  const overlay = document.getElementById('watermark-overlay');
  if (!overlay) return;
  
  overlay.innerHTML = '';
  overlay.style.justifyContent = state.wmPosition === 'top' ? 'center' : (state.wmPosition === 'bottom' ? 'center' : 'center');
  overlay.style.alignItems = state.wmPosition === 'top' ? 'flex-start' : (state.wmPosition === 'bottom' ? 'flex-end' : 'center');
  
  if (state.wmType === 'text') {
    const el = document.createElement('div');
    el.className = 'watermark-text';
    el.textContent = state.wmText;
    el.style.opacity = state.wmOpacity;
    el.style.transform = `rotate(${state.wmRotate}deg)`;
    overlay.appendChild(el);
  } else if (state.wmImage) {
    const img = document.createElement('img');
    img.className = 'watermark-image';
    img.src = state.wmImage;
    img.style.opacity = state.wmOpacity;
    img.style.transform = `rotate(${state.wmRotate}deg)`;
    overlay.appendChild(img);
  }
}

// --- Export ---

elements.applyBtn.addEventListener('click', async () => {
  if (!state.originalBuffer) return;
  
  const pdfDoc = await PDFDocument.load(state.originalBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let wmImg = null;
  if (state.wmType === 'image' && state.wmImage) {
    wmImg = await pdfDoc.embedPng(state.wmImage); // Assuming PNG for now
  }

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    let x = width / 2;
    let y = height / 2;
    
    if (state.wmPosition === 'top') y = height - 100;
    if (state.wmPosition === 'bottom') y = 100;

    if (state.wmType === 'text') {
      page.drawText(state.wmText, {
        x,
        y,
        size: 60,
        font,
        color: rgb(0, 0, 0),
        opacity: state.wmOpacity,
        rotate: degrees(state.wmRotate),
        pivot: [0, 0]
      });
    } else if (wmImg) {
      const iw = 200;
      const ih = (wmImg.height / wmImg.width) * iw;
      page.drawImage(wmImg, {
        x: x - iw/2,
        y: y - ih/2,
        width: iw,
        height: ih,
        opacity: state.wmOpacity,
        rotate: degrees(state.wmRotate)
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  saveAs(new Blob([pdfBytes]), 'watermarked_document.pdf');
});
