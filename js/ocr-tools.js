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
  // Configure recognition to also return PDF data
  const { data } = await state.worker.recognize(file, {
    pdfTitle: 'Searchable PDF',
    pdfFolderName: 'pdf'
  }, { pdf: true });
  
  state.extractedText = data.text;
  if (data.pdf) {
    state.pdfBlob = new Blob([new Uint8Array(data.pdf)], { type: 'application/pdf' });
  }
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
  state.pdfBlob = null; // We generate this on demand for PDFs
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

elements.downloadPdf.addEventListener('click', async () => {
  if (state.pdfBlob) {
    saveAs(state.pdfBlob, 'searchable_document.pdf');
  } else if (state.extractedText) {
    try {
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const lines = state.extractedText.split('\n');
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let y = height - 50;
      const fontSize = 10;
      const margin = 50;

      for (const line of lines) {
        if (y < margin + 20) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        // Simple text wrapping by length
        const chunks = line.match(/.{1,90}/g) || [line];
        for (const chunk of chunks) {
            if (y < margin) {
                page = pdfDoc.addPage();
                y = height - margin;
            }
            page.drawText(chunk, {
                x: margin,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            y -= fontSize + 5;
        }
      }

      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes]), 'extracted_text.pdf');
    } catch (e) {
      console.error(e);
      alert('Error generating PDF: ' + e.message);
    }
  } else {
    alert('No text extracted yet.');
  }
});

elements.copyText.addEventListener('click', () => {
  elements.extractedText.select();
  document.execCommand('copy');
  alert('Text copied to clipboard!');
});
