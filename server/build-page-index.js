#!/usr/bin/env node
/**
 * Build Page Index — maps section titles → page numbers in a PDF
 *
 * Creates a JSON file that tells the frontend which page of the PDF
 * to render when a particular section is referenced.
 *
 * Usage:
 *   node build-page-index.js <path-to-pdf> [--doc-id CEDEX-BHT-UM-001]
 *
 * Output: server/manuals/<doc-id>.pages.json
 */

const fs = require('fs');
const path = require('path');

// ── CLI args ──
const args = process.argv.slice(2);
const pdfPath = args.find(a => !a.startsWith('--'));
let docId = 'CEDEX-BHT-UM-001';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--doc-id' && args[i + 1]) docId = args[i + 1];
}

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Usage: node build-page-index.js <path-to-pdf> [--doc-id ID]');
  process.exit(1);
}

// ── Section detection (same patterns as ingest-pdf.js) ──
const SECTION_PATTERNS = [
  /^(\d+\.?\d*\.?\d*)\s+([A-Z][\w\s\-\/&,]+)/,
  /^Chapter\s+(\d+)[:\s]+(.+)/i,
  /^(SECTION|PART)\s+(\d+)[:\s]+(.+)/i,
];

function detectSection(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120 || trimmed.length < 3) return null;
  for (const pat of SECTION_PATTERNS) {
    if (pat.test(trimmed)) return trimmed;
  }
  return null;
}

async function main() {
  console.log(`Building page index for ${path.basename(pdfPath)} (${docId})…`);

  const pdfBuffer = fs.readFileSync(pdfPath);

  // Use pdfjs-dist (ESM) for per-page text extraction
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;

  const pageIndex = [];
  const seen = new Set();

  console.log(`Scanning ${pdfDoc.numPages} pages…`);

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join('\n');

    // Look for section headings on this page
    const lines = pageText.split('\n');
    for (const line of lines) {
      const section = detectSection(line);
      if (section && !seen.has(section)) {
        seen.add(section);
        pageIndex.push({ section, page: pageNum });
      }
    }

    if (pageNum % 50 === 0) console.log(`  …scanned ${pageNum}/${pdfDoc.numPages} pages`);
  }

  // Also add some keyword → page mappings for common queries
  // Scan each page for key equipment terms
  const keyTerms = ['hardware', 'reagent disk', 'cuvette', 'probe', 'touchscreen',
    'main cover', 'sample rack', 'waste', 'barcode', 'ISE', 'electrode',
    'troubleshooting', 'maintenance', 'calibration', 'error', 'alarm'];

  const termPages = {};
  // Skip TOC/intro pages (first ~15 pages) to find actual content pages
  for (let pageNum = 16; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();

    for (const term of keyTerms) {
      if (pageText.includes(term) && !termPages[term]) {
        termPages[term] = pageNum;
      }
    }
  }

  const output = {
    docId,
    totalPages: pdfDoc.numPages,
    sections: pageIndex,
    keywords: termPages
  };

  const outPath = path.join(__dirname, 'manuals', `${docId}.pages.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDone! ${pageIndex.length} sections mapped.`);
  console.log(`Saved to: ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
