// Configure PDF.js worker (required for pdf.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressTitle = document.getElementById('progressTitle');
const progressBar = document.getElementById('progressBar');
const resultsSection = document.getElementById('resultsSection');
const uploadAgainBtn = document.getElementById('uploadAgainBtn');
const resultsTableContainer = document.getElementById('resultsTableContainer');

let allResults = [];
let currentPage = 1;
const pageSize = 10;

// UI helpers
function showUploadBtn() {
    uploadBtn.style.display = 'inline-block';
    fileInput.value = '';
    progressContainer.style.display = 'none';
    resultsSection.style.display = 'none';
    resultsTableContainer.innerHTML = '';
}
function showProgress(title, percent, color = '#4f8cff') {
    progressContainer.style.display = 'block';
    progressTitle.textContent = title;
    progressBar.style.width = percent + '%';
    progressBar.style.background = color;
}
function hideProgress() {
    progressContainer.style.display = 'none';
}
function showResults(results) {
    allResults = results;
    currentPage = 1;
    resultsSection.style.display = 'block';
    renderResultsTable();
}
function renderResultsTable() {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, allResults.length);
    let tableHtml = `<table class="results-table">
        <tr>
            <th>Preview</th>
            <th>File Name</th>
            <th>Download Corrected</th>
        </tr>`;
    for (let i = startIdx; i < endIdx; i++) {
        const res = allResults[i];
        let preview = res.previewDataUrl
            ? `<img src="${res.previewDataUrl}" class="pdf-preview" alt="PDF Preview">`
            : `<img src="pdf_placeholder.svg" class="pdf-preview" alt="PDF Preview">`;
        let downloadBtn = res.ocrBlobUrl
            ? `<a href="${res.ocrBlobUrl}" download="${res.ocrFilename}" title="Download corrected PDF" class="ocr-download-btn">${downloadSvg()}</a>`
            : `<span style="color:#888;">Error</span>`;
        tableHtml += `<tr>
            <td>${preview}</td>
            <td>${res.filename}</td>
            <td>${downloadBtn}</td>
        </tr>`;
    }
    tableHtml += `</table>`;

    // Pagination
    if (allResults.length > pageSize) {
        let pages = Math.ceil(allResults.length / pageSize);
        tableHtml += `<div class="pagination">
            <button class="pagination-btn" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${currentPage} of ${pages}</span>
            <button class="pagination-btn" id="nextPageBtn" ${currentPage === pages ? 'disabled' : ''}>Next</button>
        </div>`;
    }

    resultsTableContainer.innerHTML = tableHtml;
    if (allResults.length > pageSize) {
        document.getElementById('prevPageBtn').onclick = () => { if (currentPage > 1) { currentPage--; renderResultsTable(); } };
        document.getElementById('nextPageBtn').onclick = () => { let pages = Math.ceil(allResults.length / pageSize); if (currentPage < pages) { currentPage++; renderResultsTable(); } };
    }
}

// SVG download icon (inline, style-coherent)
function downloadSvg() {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#4f8cff"/><path d="M16 8v12m0 0l-4-4m4 4l4-4m-10 8h12" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// OCR + PDF reconstruction (for each file)
async function processPDF(file, idx, total) {
    const arrayBuffer = await file.arrayBuffer();
    // Load PDF for preview
    let previewDataUrl = "";
    let doc;
    try {
        doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        previewDataUrl = canvas.toDataURL("image/png");
    } catch {
        previewDataUrl = "";
    }

    // OCR: for each page, image -> text
    let numPages = 1;
    try {
        numPages = doc.numPages;
    } catch {}

    // Create blank PDF with pdf-lib
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= numPages; i++) {
        showProgress(`OCR (${file.name}): page ${i}/${numPages}`, Math.round(((i-1)/numPages)*100), '#34d49c');
        let page;
        try {
            page = await doc.getPage(i);
        } catch {
            continue;
        }
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Extract image as PNG
        const imgDataUrl = canvas.toDataURL('image/png');

        // Multilanguage OCR (Italian + English), get words with bounding box
        let ocrResult = null;
        try {
            ocrResult = await Tesseract.recognize(
                imgDataUrl,
                'ita+eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            showProgress(`OCR (${file.name}): page ${i}/${numPages} (${Math.round(m.progress*100)}%)`, Math.round(((i-1+m.progress)/numPages)*100), '#34d49c');
                        }
                    }
                }
            );
        } catch (e) {
            console.error(`OCR error on page ${i} (${file.name}):`, e);
            continue;
        }

        // Add page to pdf-lib
        const imgBytes = await fetch(imgDataUrl).then(r => r.arrayBuffer());
        const pdfImage = await pdfDoc.embedPng(imgBytes);
        const { width, height } = pdfImage;
        const pdfPage = pdfDoc.addPage([width, height]);
        pdfPage.drawImage(pdfImage, { x: 0, y: 0, width, height });

        // OCR text layer mapping: each word at its position with dynamic font size
        if (ocrResult && ocrResult.data && Array.isArray(ocrResult.data.words)) {
            ocrResult.data.words.forEach(word => {
                if (!word.text.trim()) return;
                const x = word.bbox.x0;
                const y = canvas.height - word.bbox.y1;
                const boxHeight = word.bbox.y1 - word.bbox.y0;
                const maxWidth = word.bbox.x1 - word.bbox.x0;
                // Font size proportional to bbox height, with min/max limits
                const fontSize = Math.max(7, Math.min(32, boxHeight * 0.85));
                pdfPage.drawText(word.text, {
                    x: x,
                    y: y,
                    size: fontSize,
                    font: helveticaFont,
                    color: rgb(1,1,1),
                    opacity: 0.01, // invisible, selectable
                    maxWidth: maxWidth,
                    lineHeight: boxHeight * 1.05,
                });
            });
        }
    }
    showProgress(`Saving corrected PDF...`, 100, '#34d49c');

    // Output PDF
    let ocrBlobUrl = null;
    let ocrFilename = file.name.replace(/\.pdf$/i, '_OCR.pdf');
    try {
        const pdfBytes = await pdfDoc.save();
        ocrBlobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    } catch (e) {
        ocrBlobUrl = null;
    }

    return {
        filename: file.name,
        previewDataUrl,
        ocrBlobUrl,
        ocrFilename
    };
}

function filterFiles(files) {
    return Array.from(files).filter(f =>
        f.type === "application/pdf" &&
        !f.name.toLowerCase().endsWith('.lnk') &&
        f.name.toLowerCase().endsWith('.pdf')
    );
}

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = async function() {
    const files = filterFiles(fileInput.files);
    if (files.length === 0) {
        alert('Only original PDF files are accepted!');
        showUploadBtn();
        return;
    }
    uploadBtn.style.display = 'none';
    showProgress('Uploading files...', 0, '#4f8cff');

    let results = [];
    for (let i = 0; i < files.length; i++) {
        showProgress(`Processing... (${i+1}/${files.length})`, Math.round(((i)/files.length)*100), '#4f8cff');
        let res = await processPDF(files[i], i+1, files.length);
        results.push(res);
        showProgress(`Processing... (${i+1}/${files.length})`, Math.round(((i+1)/files.length)*100), '#4f8cff');
    }
    hideProgress();
    showResults(results);
};

uploadAgainBtn.onclick = showUploadBtn;

showUploadBtn();