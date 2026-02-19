require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

const DOCS_DIR = path.join(__dirname, '../docs/sops');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseChunks(content, docId) {
  // Pull the document title out of the metadata table at the top
  const titleMatch = content.match(/\*\*Title\*\*\s*\|\s*(.+)/);
  const docTitle = titleMatch ? titleMatch[1].trim() : docId;

  const chunks = [];
  const lines = content.split('\n');

  let currentTitle = 'Overview';
  let currentLines = [];

  for (const line of lines) {
    // New section starts at ## or ### or #### heading
    if (line.match(/^#{2,4}\s+/)) {
      const text = currentLines.join('\n').trim();
      if (text.length > 80) {
        chunks.push({
          doc_id: docId,
          doc_title: docTitle,
          section_title: currentTitle,
          // Prefix content with doc + section so embeddings carry that context
          content: `[${docId}] ${docTitle}\nSection: ${currentTitle}\n\n${text}`
        });
      }
      currentTitle = line.replace(/^#+\s+/, '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Last chunk
  const text = currentLines.join('\n').trim();
  if (text.length > 80) {
    chunks.push({
      doc_id: docId,
      doc_title: docTitle,
      section_title: currentTitle,
      content: `[${docId}] ${docTitle}\nSection: ${currentTitle}\n\n${text}`
    });
  }

  return chunks;
}

async function ingest() {
  console.log('\n🔄 Starting SOP ingestion into Supabase...\n');

  // Wipe existing chunks so we start clean
  const { error: deleteError } = await supabase
    .from('sop_chunks')
    .delete()
    .gte('created_at', '2000-01-01');

  if (deleteError) {
    console.error('❌ Could not clear old chunks:', deleteError.message);
    process.exit(1);
  }
  console.log('🗑️  Cleared existing chunks\n');

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
  console.log(`📂 Found ${files.length} documents to ingest\n`);

  let totalChunks = 0;

  for (const file of files) {
    const docId = file.replace('.md', '');
    const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
    const chunks = parseChunks(content, docId);

    console.log(`📄 ${docId} → ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Get the vector embedding from Voyage AI
      const result = await voyage.embed({
        input: [chunk.content],
        model: 'voyage-3-lite'
      });

      const embedding = result.data[0].embedding;

      // Store chunk + embedding in Supabase
      const { error } = await supabase.from('sop_chunks').insert({
        doc_id: chunk.doc_id,
        doc_title: chunk.doc_title,
        section_title: chunk.section_title,
        content: chunk.content,
        embedding
      });

      if (error) {
        console.error(`  ❌ Chunk ${i + 1} failed: ${error.message}`);
      } else {
        process.stdout.write(`  ✓ ${i + 1}/${chunks.length}\r`);
      }

      // Brief pause to stay within rate limits
      await sleep(120);
    }

    totalChunks += chunks.length;
    console.log(`  ✅ Done (${chunks.length} chunks)            `);
  }

  console.log(`\n✅ Ingestion complete — ${totalChunks} chunks stored in Supabase.\n`);
}

ingest().catch(err => {
  console.error('\n❌ Ingestion failed:', err.message);
  process.exit(1);
});
