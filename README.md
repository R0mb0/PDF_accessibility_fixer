# PDF_accessibility_fixer

Client-side tool to check and fix PDF accessibility. Analyze PDFs for text layer accessibility, detect image-only pages, and rebuild selectable text layers with browser-based OCR—no server or backend required. Perfect for privacy-first and legacy environments.

---

## 🚀 Features

- **Convert scanned PDFs to accessible PDFs** with selectable, searchable text
- **Runs entirely in the browser** (no server, no backend, no installation required)
- **Privacy-first**: Your files never leave your computer
- **Multi-page PDF support**
- **Fast preview and progress bar** for multi-file processing
- **Download corrected PDFs** with OCR text layer
- **Pagination and batch processing**
- **Modern, responsive UI** with light/dark mode

---

## 🛠️ How it works

1. **Upload your scanned PDF(s)** via the browser interface.
2. The tool renders each PDF page as an image in the browser.
3. **Tesseract.js** performs OCR on each page, recognizing text and extracting bounding box data for each word or line.
4. **pdf-lib** reconstructs a new PDF by overlaying an invisible, selectable text layer that closely matches the original layout.
5. **Download** the corrected, accessible PDF.

---

## 🏆 What makes it special?

- **No backend or server needed:** Everything runs in your browser. Perfect for privacy-conscious workflows or environments where installation of new software is not possible.
- **No dependencies beyond your browser:** Works on Windows, Mac, Linux, ChromeOS — anywhere with a modern browser.
- **Efficient layout mapping:** By using Tesseract’s bounding box data, the selectable text is placed as close as possible to its original location, making the document highly usable and accessible.

---

## 💡 Why use this tool?

- **Accessibility compliance:** Make legacy/scanned PDFs accessible for screen readers.
- **Searchable archives:** Enable text search in your PDF documents.
- **Privacy:** Sensitive documents remain on your device.
- **No software installation:** Ideal for users with restricted environments (e.g., corporate/government computers).

---

## 🔒 Privacy & Security

- **All processing is done locally** in your browser.
- **No file is sent to any server**.
- **No data is stored** except for temporary in-memory use during the browser session.

---

## ⚡ Getting Started

1. **Download or clone this repository**
2. Open `index.html` in your browser (no build step required)
3. Upload your PDF files and process them!

> **Note:** For best performance, use a modern browser (Chrome, Firefox, Edge, Safari).

---

## ✨ Limitations & Notes

- The output text layer aims to match the original as closely as possible, but may not be pixel-perfect due to:
  - Variations in OCR accuracy
  - Differences in font detection (fonts are approximated, not extracted)
  - Word/line bounding boxes
- Large PDFs or images may process slowly depending on your device's capabilities.
- This tool is not a replacement for professional OCR tools like [ocrmypdf](https://github.com/ocrmypdf/OCRmyPDF), but provides an excellent privacy-focused alternative.

---

## 📖 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Credits & Inspiration

- [Tesseract.js](https://github.com/naptha/tesseract.js)
- [pdf-lib](https://github.com/Hopding/pdf-lib)
- [PDF.js](https://github.com/mozilla/pdf.js)
- Inspired by the need for privacy-first, accessible PDF processing in restricted environments.

