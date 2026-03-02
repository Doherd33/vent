'use strict';
const { VoyageAIClient } = require('voyageai');
const config = require('./config');

function getVoyageClient() {
  const key = config.voyageApiKey;
  if (!key) return { client: null, key: null };
  return { client: new VoyageAIClient({ apiKey: key }), key };
}

function makeRag(supabase) {
  // Text search fallback when Voyage is unavailable
  async function getChunksByText(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (!words.length) return [];
    const { data, error } = await supabase
      .from('sop_chunks')
      .select('doc_id, doc_title, section_title, content')
      .or(words.slice(0, 3).map(w => `content.ilike.%${w}%`).join(','))
      .limit(6);
    if (error) { console.error('Text search error:', error.message); return []; }
    return (data || []).map(c => ({ ...c, similarity: 0.5 }));
  }

  // Search Supabase for SOP chunks relevant to the observation
  async function getRelevantChunks(observation, area) {
    const { client: voyage, key } = getVoyageClient();
    if (key) {
      try {
        const result = await voyage.embed({
          input: [`Process area: ${area}. ${observation}`],
          model: 'voyage-3-lite'
        });
        const embedding = result.data[0].embedding;
        const { data, error } = await supabase.rpc('match_sop_chunks', {
          query_embedding: embedding,
          match_count: 6
        });
        if (!error && data && data.length) return data;
        console.warn('Vector search returned nothing, falling back to text search');
      } catch (err) {
        console.warn('Voyage failed, falling back to text search:', err.message);
      }
    } else {
      console.warn('No Voyage key — using text search fallback');
    }
    return getChunksByText(`${area} ${observation}`);
  }

  // Format retrieved SOP chunks into a readable context block for Claude
  function buildSopContext(chunks) {
    if (!chunks.length) return 'No specific SOP sections retrieved for this observation.';

    return chunks
      .map(c => `Document: ${c.doc_id} — ${c.doc_title}\nSection: ${c.section_title}\n\n${c.content}`)
      .join('\n\n---\n\n');
  }

  // Search existing submissions for similar observations
  async function findSimilarSubmissions(observation, area) {
    try {
      const words = observation.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 5);
      if (!words.length) return { matches: [], count: 0 };

      const { data, error } = await supabase
        .from('submissions')
        .select('ref_code, process_area, priority, raw_text, created_at, status, structured')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return { matches: [], count: 0 };

      // Score each submission by keyword overlap
      const scored = data.map(row => {
        const text = (row.raw_text || '').toLowerCase();
        const matchedWords = words.filter(w => text.includes(w));
        const areaMatch = (row.process_area || '').toLowerCase() === (area || '').toLowerCase();
        const score = matchedWords.length + (areaMatch ? 1.5 : 0);
        return { ...row, score, matchedWords };
      }).filter(r => r.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        matches: scored.map(s => ({
          ref: s.ref_code,
          area: s.process_area,
          priority: s.priority,
          status: s.status || 'new',
          date: s.created_at,
          excerpt: (s.raw_text || '').slice(0, 150),
          matchedWords: s.matchedWords,
          score: s.score
        })),
        count: scored.length,
        totalSubmissions: data.length
      };
    } catch (err) {
      console.warn('Pattern detection failed:', err.message);
      return { matches: [], count: 0 };
    }
  }

  // Build pattern context string for Claude
  function buildPatternContext(patterns) {
    if (!patterns.matches.length) {
      return 'No similar previous submissions found in the database.';
    }
    const lines = patterns.matches.map((m, i) =>
      `${i + 1}. ${m.ref} (${m.area}, ${m.priority}, ${m.status}) — ${m.date.slice(0, 10)}\n   "${m.excerpt}"`
    );
    return `${patterns.count} similar submission(s) found out of ${patterns.totalSubmissions} total:\n\n${lines.join('\n\n')}`;
  }

  return { getChunksByText, getRelevantChunks, buildSopContext, findSimilarSubmissions, buildPatternContext };
}

module.exports = { getVoyageClient, makeRag };
