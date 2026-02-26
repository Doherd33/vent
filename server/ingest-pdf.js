#!/usr/bin/env node
/**
 * PDF → SOP Ingest Script
 *
 * Extracts text from a PDF, chunks it by sections/pages,
 * embeds with Voyage, and stores in Supabase sop_chunks.
 *
 * Usage:
 *   node ingest-pdf.js <path-to-pdf> [--doc-id CEDEX-UM-001] [--title "Cedex Bio HT Analyzer User Manual"]
 *
 * This does NOT clear existing SOPs — it adds alongside them.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');

// ── Config ──
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY || process.env.VOYAGE_KEY });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Parse CLI args ──
const args = process.argv.slice(2);
const pdfPath = args.find(a => !a.startsWith('--'));
let docId = 'CEDEX-UM-001';
let docTitle = 'Cedex Bio HT Analyzer User Manual';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--doc-id' && args[i + 1]) docId = args[i + 1];
  if (args[i] === '--title' && args[i + 1]) docTitle = args[i + 1];
}

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Usage: node ingest-pdf.js <path-to-pdf> [--doc-id ID] [--title "Title"]');
  console.error('  PDF path not found:', pdfPath || '(none)');
  process.exit(1);
}

// ── Section detection patterns ──
const SECTION_PATTERNS = [
  /^(\d+\.?\d*\.?\d*)\s+([A-Z][\w\s\-\/&,]+)/,       // "1.2 Section Name" or "3.4.1 Sub Section"
  /^Chapter\s+(\d+)[:\s]+(.+)/i,                        // "Chapter 3: Something"
  /^(SECTION|PART)\s+(\d+)[:\s]+(.+)/i,                // "SECTION 2: Something"
  /^([A-Z][A-Z\s\-\/&]{4,})$/,                          // "ALL CAPS HEADING" (standalone line)
];

function detectSectionTitle(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return null;

  for (const pat of SECTION_PATTERNS) {
    const m = trimmed.match(pat);
    if (m) return trimmed;
  }
  return null;
}

// ── Chunk the PDF text ──
function chunkText(fullText, maxChunkSize = 2000) {
  const lines = fullText.split('\n');
  const chunks = [];
  let currentTitle = 'Overview';
  let currentLines = [];
  let currentSize = 0;

  function flushChunk() {
    const text = currentLines.join('\n').trim();
    // Only keep chunks with meaningful content (not just whitespace or very short)
    if (text.length > 60) {
      // If chunk is too large, split it
      if (text.length > maxChunkSize) {
        const subChunks = splitLargeChunk(text, currentTitle, maxChunkSize);
        chunks.push(...subChunks);
      } else {
        chunks.push({
          section_title: currentTitle,
          content: text
        });
      }
    }
    currentLines = [];
    currentSize = 0;
  }

  function splitLargeChunk(text, title, maxSize) {
    const result = [];
    const paragraphs = text.split(/\n\s*\n/);
    let batch = [];
    let batchSize = 0;
    let part = 1;

    for (const para of paragraphs) {
      if (batchSize + para.length > maxSize && batch.length > 0) {
        result.push({
          section_title: title + (result.length > 0 || paragraphs.length > 1 ? ` (Part ${part})` : ''),
          content: batch.join('\n\n').trim()
        });
        part++;
        batch = [];
        batchSize = 0;
      }
      batch.push(para);
      batchSize += para.length;
    }
    if (batch.length > 0) {
      result.push({
        section_title: title + (result.length > 0 ? ` (Part ${part})` : ''),
        content: batch.join('\n\n').trim()
      });
    }
    return result;
  }

  for (const line of lines) {
    const heading = detectSectionTitle(line);
    if (heading && currentLines.length > 0) {
      flushChunk();
      currentTitle = heading;
    } else if (heading && currentLines.length === 0) {
      currentTitle = heading;
    }

    currentLines.push(line);
    currentSize += line.length;

    // Force a chunk break if we're getting too large
    if (currentSize > maxChunkSize * 1.5) {
      flushChunk();
    }
  }

  // Flush remaining
  flushChunk();

  return chunks;
}

// ── Main ──
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Vent PDF Ingest');
  console.log('═══════════════════════════════════════════');
  console.log(`  PDF:      ${path.basename(pdfPath)}`);
  console.log(`  Doc ID:   ${docId}`);
  console.log(`  Title:    ${docTitle}`);
  console.log('');

  // Step 1: Extract text from PDF
  console.log('[1/4] Extracting text from PDF…');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdf = await pdfParse(pdfBuffer);
  console.log(`       ${pdf.numpages} pages, ${pdf.text.length.toLocaleString()} characters extracted`);

  if (pdf.text.length < 100) {
    console.error('ERROR: Very little text extracted. The PDF may be image-based (scanned).');
    console.error('       Image-based PDFs need OCR, which this script does not support yet.');
    process.exit(1);
  }

  // Step 2: Chunk the text
  console.log('[2/4] Chunking into sections…');
  const chunks = chunkText(pdf.text);
  console.log(`       ${chunks.length} chunks created`);

  if (chunks.length === 0) {
    console.error('ERROR: No usable chunks extracted from the PDF.');
    process.exit(1);
  }

  // Show chunk summary
  chunks.forEach((c, i) => {
    console.log(`       [${i + 1}] ${c.section_title} (${c.content.length} chars)`);
  });

  // Step 3: Remove any existing chunks for this doc_id (don't touch other SOPs)
  console.log(`\n[3/4] Clearing existing chunks for ${docId}…`);
  const { error: delErr } = await supabase
    .from('sop_chunks')
    .delete()
    .eq('doc_id', docId);
  if (delErr) {
    console.error('       Warning: delete failed:', delErr.message);
  } else {
    console.log('       Done');
  }

  // Step 4: Embed and store each chunk
  console.log(`[4/4] Embedding and storing ${chunks.length} chunks…`);
  let stored = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const fullContent = `[${docId}] ${docTitle}\nSection: ${chunk.section_title}\n\n${chunk.content}`;

    try {
      // Embed with Voyage
      const embResult = await voyage.embed({
        input: [fullContent],
        model: 'voyage-3-lite'
      });
      const embedding = embResult.data[0].embedding;

      // Store in Supabase
      const { error: insertErr } = await supabase.from('sop_chunks').insert({
        doc_id: docId,
        doc_title: docTitle,
        section_title: chunk.section_title,
        content: fullContent,
        embedding
      });

      if (insertErr) {
        console.error(`       [${i + 1}] INSERT ERROR: ${insertErr.message}`);
        errors++;
      } else {
        stored++;
        process.stdout.write(`       [${i + 1}/${chunks.length}] ${chunk.section_title.substring(0, 50)}… ✓\n`);
      }

      // Rate limit — Voyage has limits
      await sleep(150);

    } catch (err) {
      console.error(`       [${i + 1}] ERROR: ${err.message}`);
      errors++;
      await sleep(500); // longer pause on error
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  DONE: ${stored} chunks stored, ${errors} errors`);
  console.log(`  Doc ID: ${docId}`);
  console.log(`  Search for it on the Query SOPs page!`);
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
