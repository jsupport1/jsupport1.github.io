const state = {
  worker: null,
  isProcessing: false,
  extractedText: '',
  pdfBlob: null
};

const elements = {
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  progressWrap: document.getElementById('progress-wrap'),
  statusText: document.getElementById('status-text'),
  percentText: document.getElementById('percent-text'),
  progressFill: document.getElementById('progress-fill'),
  resultWrap: document.getElementById('result-wrap'),
  extractedText: document.getElementById('extracted-text'),
  downloadTxt: document.getElementById('download-txt'),
  downloadPdf: document.getElementById('download-pdf'),
  copyText: document.getElementById('copy-text'),
  fileInfo: document.getElementById('file-info')
};

// --- Initialization ---

elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

async function handleFile(file) {
  if (!file || state.isProcessing) return;
  
  state.isProcessing = true;
  state.extractedText = '';
  elements.dropZone.style.display = 'none';
  elements.progressWrap.style.display = 'block';
  elements.resultWrap.style.display = 'none';
  elements.fileInfo.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

  try {
    if (!state.worker) {
      updateProgress('Initializing OCR Engine...', 10);
      state.worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            updateProgress(`Recognizing: ${Math.round(m.progress * 100)}%`, 20 + (m.progress * 80));
          }
        }
      });
      await state.worker.loadLanguage('eng');
      await state.worker.initialize('eng');
    }

    if (file.type === 'application/pdf') {
      await processPdf(file);
    } else {
      await processImage(file);
    }

    finalize();
  } catch (err) {
    console.error(err);
    alert('OCR Error: ' + err.message);
    reset();
  }
}

async function processImage(file) {
  updateProgress('Scanning Image...', 20);
  const { data } = await state.worker.recognize(file);
  state.extractedText = data.text;
  
  // For Searchable PDF, we use the Tesseract scheduler/recognize flow which supports PDF output
  // Tesseract.js v4+ supports PDF output directly in recognize
  // But since we already have a worker, we might need to use a different approach or a separate call
  // For now, let's just use the direct recognize for the searchable PDF too
  const { data: pdfData } = await Tesseract.recognize(file, 'eng', {
    pdfTitle: 'Searchable PDF',
    pdfFolderName: 'pdf'
  });
  state.pdfBlob = new Blob([new Uint8Array(pdfData.pdf)], { type: 'application/pdf' });
}

async function processPdf(file) {
  updateProgress('Rendering PDF Pages...', 20);
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const numPages = pdf.numPages;
  
  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    updateProgress(`Processing Page ${i} of ${numPages}...`, 20 + (i / numPages * 70));
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High DPI for better OCR
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    const { data } = await state.worker.recognize(canvas);
    fullText += `--- Page ${i} ---\n${data.text}\n\n`;
  }
  state.extractedText = fullText;
}

function updateProgress(text, percent) {
  elements.statusText.textContent = text;
  elements.percentText.textContent = `${Math.round(percent)}%`;
  elements.progressFill.style.width = `${percent}%`;
}

function finalize() {
  state.isProcessing = false;
  elements.progressWrap.style.display = 'none';
  elements.resultWrap.style.display = 'block';
  elements.extractedText.value = state.extractedText;
}

function reset() {
  state.isProcessing = false;
  elements.dropZone.style.display = 'block';
  elements.progressWrap.style.display = 'none';
}

// --- Actions ---

elements.downloadTxt.addEventListener('click', () => {
  const blob = new Blob([state.extractedText], { type: 'text/plain' });
  saveAs(blob, 'extracted_text.txt');
});

elements.downloadPdf.addEventListener('click', () => {
  if (state.pdfBlob) {
    saveAs(state.pdfBlob, 'searchable_document.pdf');
  } else {
    alert('Searchable PDF generation is only supported for single image uploads in this version.');
  }
});

elements.copyText.addEventListener('click', () => {
  elements.extractedText.select();
  document.execCommand('copy');
  alert('Text copied to clipboard!');
});
