#!/usr/bin/env node
/**
 * Build Page Index — maps section titles → page numbers in a PDF
 *
 * Also detects which pages contain actual images/diagrams by scanning
 * the PDF operator list for image paint operations. Keywords are mapped
 * to diagram pages preferentially over text-only pages.
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

// Image operator codes in pdfjs-dist OPS
const IMAGE_OPS = new Set([82, 83, 84, 85, 86]);
// 82 = paintJpegXObject, 83 = paintImageMaskXObject, 84 = paintInlineImageXObject
// 85 = paintImageXObject, 86 = paintInlineImageXObjectGroup

async function main() {
  console.log(`Building page index for ${path.basename(pdfPath)} (${docId})…`);

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;

  const pageIndex = [];
  const seen = new Set();
  const diagramPages = [];       // pages that contain actual images/diagrams
  const pageTextMap = {};        // pageNum → lowercase text (for keyword scan)

  console.log(`Scanning ${pdfDoc.numPages} pages for sections + diagrams…`);

  // ── Single pass: extract sections, detect images, cache text ──
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);

    // Get text content
    const textContent = await page.getTextContent();
    const items = textContent.items.map(item => item.str);
    const pageText = items.join('\n');

    // Look for section headings
    const lines = pageText.split('\n');
    for (const line of lines) {
      const section = detectSection(line);
      if (section && !seen.has(section)) {
        seen.add(section);
        pageIndex.push({ section, page: pageNum });
      }
    }

    // Cache lowercase text for keyword scanning (skip first 15 pages = TOC)
    if (pageNum > 15) {
      pageTextMap[pageNum] = items.join(' ').toLowerCase();
    }

    // Detect images via operator list
    const ops = await page.getOperatorList();
    let imageCount = 0;
    for (const fn of ops.fnArray) {
      if (IMAGE_OPS.has(fn)) imageCount++;
    }
    // A page with images is a diagram page (skip pages with just 1 tiny logo)
    // Most diagram pages have multiple image ops or at least a significant one
    if (imageCount >= 1 && pageNum > 5) {
      diagramPages.push(pageNum);
    }

    if (pageNum % 50 === 0) console.log(`  …scanned ${pageNum}/${pdfDoc.numPages} pages`);
  }

  console.log(`Found ${diagramPages.length} pages with images/diagrams.`);

  // ── Count how often each page appears as a diagram page to detect
  // repeated logos (pages that ALL have images are likely just headers) ──
  // If more than 80% of pages have images, it's probably a logo on every page
  const diagramSet = new Set(diagramPages);
  const diagramRatio = diagramPages.length / pdfDoc.numPages;
  let filteredDiagramPages;
  if (diagramRatio > 0.6) {
    // Too many — likely every page has a logo. Try to filter by checking
    // pages that have MORE than the median number of image ops
    console.log(`  High diagram ratio (${(diagramRatio * 100).toFixed(0)}%) — re-scanning with stricter filter…`);
    const pageCounts = {};
    for (let pageNum = 6; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const ops = await page.getOperatorList();
      let count = 0;
      for (const fn of ops.fnArray) {
        if (IMAGE_OPS.has(fn)) count++;
      }
      pageCounts[pageNum] = count;
    }
    // Find median image count
    const counts = Object.values(pageCounts).sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)] || 1;
    const threshold = Math.max(median + 1, 2);
    console.log(`  Median image ops per page: ${median}, threshold: ${threshold}`);
    filteredDiagramPages = Object.entries(pageCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([p]) => parseInt(p))
      .sort((a, b) => a - b);
    console.log(`  Filtered to ${filteredDiagramPages.length} diagram pages.`);
  } else {
    filteredDiagramPages = diagramPages;
  }

  const diagramPageSet = new Set(filteredDiagramPages);

  // ── Keyword → page mappings (prefer diagram pages) ──
  const keyTerms = ['hardware', 'reagent disk', 'cuvette', 'probe', 'touchscreen',
    'main cover', 'sample rack', 'waste', 'barcode', 'ISE', 'electrode',
    'troubleshooting', 'maintenance', 'calibration', 'error', 'alarm',
    'front view', 'rear view', 'side view', 'overview', 'component',
    'diagram', 'figure', 'illustration', 'layout', 'schematic',
    'sensor', 'pump', 'tubing', 'filter', 'lamp', 'photometer',
    'cleaning', 'replacement', 'installation', 'assembly',
    'cedex', 'analyzer', 'instrument', 'machine', 'system',
    'display', 'screen', 'button', 'door', 'panel', 'module',
    'rotor', 'mixer', 'heater', 'cooler', 'rinse', 'drain',
    'startup', 'shutdown', 'daily', 'weekly', 'monthly',
    'measurement', 'result', 'sample', 'bio ht'];

  const termPages = {};          // keyword → first text page
  const termDiagramPages = {};   // keyword → first page with BOTH text + images

  for (const [pageNumStr, pageText] of Object.entries(pageTextMap)) {
    const pageNum = parseInt(pageNumStr);
    for (const term of keyTerms) {
      if (!pageText.includes(term)) continue;
      // First text match
      if (!termPages[term]) termPages[term] = pageNum;
      // First diagram match (page has both the keyword AND images)
      if (!termDiagramPages[term] && diagramPageSet.has(pageNum)) {
        termDiagramPages[term] = pageNum;
      }
    }
  }

  const output = {
    docId,
    totalPages: pdfDoc.numPages,
    sections: pageIndex,
    keywords: termPages,
    keywordDiagrams: termDiagramPages,
    diagramPages: filteredDiagramPages
  };

  const outPath = path.join(__dirname, 'manuals', `${docId}.pages.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDone! ${pageIndex.length} sections, ${filteredDiagramPages.length} diagram pages mapped.`);
  console.log(`Keyword → diagram mappings: ${Object.keys(termDiagramPages).length}/${keyTerms.length}`);
  console.log(`Saved to: ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
