# Feature Proposal: Visual SOP Engine

**Status:** Proposed  
**Date:** 2026-02-24  
**Priority:** High — Potential game-changer for training, compliance, and knowledge retention

---

## 1. The Big Idea

Operators already *do* every step of every SOP, every shift, every day. Right now, that knowledge lives in their hands and heads — and it walks out the door when they leave. Vent can capture it.

**The concept:** Let operators record what they're already doing — photos, short videos, annotated clips — directly through Vent. The system then maps that media to the corresponding SOP steps, and automatically assembles rich, visual documentation that new starters can watch, follow, and learn from instead of reading 300-line text SOPs cold.

The result: **operator-generated, AI-curated, SOP-anchored visual training guides** — built continuously as a by-product of normal work.

---

## 2. Why This Changes Everything

### 2.1 The Problem Today

- New starters are handed printed SOPs (or PDFs) and expected to absorb complex procedures from text alone.
- SOPs describe *what* to do. They can't show *how* it actually looks when done correctly.
- Experienced operators carry immense tacit knowledge — the "feel" of a good connection, the sound of a pump running normally, the visual cues of a healthy culture — that is impossible to capture in written procedures.
- When experienced operators leave, that knowledge is lost entirely.
- Training is slow, inconsistent, and heavily dependent on who happens to be on shift with the new hire.

### 2.2 What Visual SOPs Solve

| Problem | Visual SOP Solution |
|---|---|
| Text-only SOPs are hard to follow | New starters *see* each step performed correctly |
| Tacit knowledge loss | Operator expertise is captured in media and preserved |
| Inconsistent training | Every new starter gets the same high-quality visual walkthrough |
| Slow onboarding | Self-paced visual learning before and alongside floor time |
| Operator disengagement | Operators become authors and experts, not just followers |
| SOP compliance gaps | Visual evidence shows *exactly* what correct execution looks like |

---

## 3. How It Works

### 3.1 Capture — Operators Record What They Do

Operators use Vent (mobile-friendly interface or tablet on the floor) during normal operations:

- **Photos** — e.g., "probe calibration buffer at pH 7.00 reading", "tubing connection to harvest port"
- **Short videos** (15–90 seconds) — e.g., "aseptic inoculation transfer", "daily sampling from bioreactor"
- **Annotated clips** — operator adds a quick voice note or text caption: *"You want to see the bubble pattern look like this before you proceed"*
- **Screen captures** — DeltaV screenshots, cell counter outputs, pH/DO trend snapshots

This isn't extra work. They're doing these operations anyway. Vent just gives them a way to hit record.

**Example — Daily Sampling (SOP-UP-003):**

1. Operator opens Vent on the floor tablet
2. Taps "Record" on the Daily Sampling workflow
3. Takes a photo of the sample port before clamping
4. Records a 30-second video of the aseptic sampling technique
5. Snaps the ViCell reading screen showing VCD/viability
6. Adds a quick note: *"Culture is slightly amber today — normal for Day 6"*
7. Uploads — done. Total extra effort: ~2 minutes

### 3.2 Map — Vent Links Media to SOP Steps

This is where the AI engine earns its keep. When media is uploaded:

1. **SOP Matching** — Vent uses its existing SOP embeddings (VoyageAI vectors in Supabase) to identify which SOP and which *specific steps* the media relates to. If the operator recorded during a "Daily Sampling" workflow, Vent knows this maps to SOP-UP-003, Sections 5.2–5.5.

2. **Step Alignment** — Using Claude, Vent analyses the media context (captions, timestamps, workflow metadata) and aligns each photo/video to the exact procedural step:
   - Photo of sample port → SOP-UP-003 §5.2.1 "Verify sample port"
   - Video of aseptic technique → SOP-UP-003 §5.2.3 "Perform aseptic sample withdrawal"
   - ViCell screenshot → SOP-UP-003 §5.3.1 "Record VCD and viability"

3. **Quality Tagging** — AI flags media quality: Is it clear? Does it show the right thing? Is there sensitive data visible that should be blurred? Does it contradict the SOP? (If so, flag for QA review — this is also a deviation detection mechanism.)

4. **Metadata Enrichment** — Each media item gets tagged with:
   - SOP reference and step number
   - Operator name and profile
   - Date, shift, batch (if applicable)
   - Equipment ID
   - AI-generated description
   - Quality/confidence score

### 3.3 Build — Vent Assembles Visual Documentation

With enough mapped media, Vent can automatically generate:

#### Visual SOP Walkthroughs
A parallel version of each SOP where every step includes:
- The original SOP text (the authoritative instruction)
- Embedded photos and video clips showing that step being performed
- Operator tips and annotations
- Multiple angles/operators for completeness

**Example output for SOP-UP-001 §5.3 — Probe Calibration:**

> **Step 5.3.1:** Prepare pH calibration buffers (pH 4.01 and pH 7.00).
>
> 📷 *[Photo: Buffer bottles laid out on BSC surface — uploaded by J. Murphy, 2026-01-14]*
>
> 🎬 *[Video: 45s — Two-point pH calibration on probe, showing buffer sequence and rinse — uploaded by R. Connolly, 2026-02-03]*
>
> 💬 Operator tip (J. Murphy): *"Always rinse with DI water between buffers — if you go straight from pH 4 to pH 7 you'll get a slow response and have to redo it."*

#### Operator Training Playlists
Curated sequences of videos covering an entire process end-to-end. A new starter can watch the full "Bioreactor Setup" playlist (maybe 20 minutes of real clips) and arrive on the floor with a visual memory of every step before they ever touch the equipment.

#### Searchable Media Library
All captured media is queryable through Vent's existing AI chat:
- *"Show me how to perform aseptic inoculation"* → returns relevant videos
- *"What does a normal Day 6 culture look like?"* → returns annotated photos
- *"How do I connect the perfusion tubing?"* → returns step-by-step clips

### 3.4 Profile — Operators Build Their Own Expertise Record

Each operator builds a personal profile within Vent that grows over time:

- **Contributions** — every photo, video, and annotation they've uploaded
- **Procedures Documented** — which SOPs they've contributed visual content for
- **Competency Map** — visual evidence of which procedures they can demonstrate proficiency in
- **Mentorship Score** — how much their content is used by other operators and trainees
- **Training Progress** (for new starters) — which visual walkthroughs they've completed, which steps they've practised

This creates a virtuous cycle:
- Senior operators are recognised for sharing knowledge → they contribute more
- New operators have clear, visual training paths → they ramp up faster
- QA has visual evidence of training completion → compliance is strengthened

---

## 4. Integration with Existing Vent Architecture

This feature layers naturally onto what Vent already has:

| Existing Capability | How Visual SOPs Use It |
|---|---|
| **Supabase database** | Store media metadata, operator profiles, step mappings, training records |
| **Supabase Storage** | Store uploaded photos and video files (with CDN delivery) |
| **VoyageAI embeddings** | Embed media captions and descriptions for semantic search alongside SOP text |
| **Claude AI** | Analyse media context, generate step descriptions, build walkthroughs, answer visual queries |
| **SOP ingestion pipeline** | Already parses SOPs into structured steps — media maps directly onto this structure |
| **QA workflows** | Review and approve visual content before it enters training materials |
| **Auth & roles** | Control who can upload, who can approve, who can view training content |

### 4.1 New Components Required

| Component | Description |
|---|---|
| **Media Upload API** | Endpoint to receive photos/videos with workflow context metadata |
| **Media Processing Pipeline** | Thumbnail generation, video compression, duration validation |
| **Step Mapping Engine** | AI-driven alignment of media to SOP steps (Claude + embeddings) |
| **Visual SOP Renderer** | Frontend component that renders a SOP with embedded media at each step |
| **Operator Profile Page** | Dashboard showing contributions, competency map, training progress |
| **Training Playlist Builder** | Auto-generates ordered media sequences for end-to-end process walkthroughs |
| **Media Review Queue** | QA interface to approve/reject/flag uploaded content |
| **Mobile Capture Interface** | Touch-optimised upload UI for floor tablets and phones |

---

## 5. Rollout Strategy

### Phase 1 — Capture & Store (MVP)
- Mobile-friendly media upload tied to active workflows
- Basic SOP step tagging (operator selects which step they're documenting)
- Media stored in Supabase Storage with metadata
- Gallery view of all uploaded media per SOP
- **Goal:** Get operators comfortable capturing and uploading

### Phase 2 — AI Mapping & Visual SOPs
- Automatic SOP step alignment via Claude
- Visual SOP walkthrough renderer (SOP text + embedded media)
- Searchable media library via Vent's AI chat
- QA review queue for uploaded content
- **Goal:** First auto-generated visual SOPs available for training

### Phase 3 — Profiles & Training Pathways
- Operator profile pages with contribution tracking
- Competency mapping per procedure
- Training playlists auto-generated from best available media
- Training completion tracking with QA sign-off
- **Goal:** New starter onboarding is primarily visual and self-paced

### Phase 4 — Continuous Improvement Loop
- AI identifies SOP steps with missing or low-quality media coverage
- Prompts specific operators to capture missing steps during their next shift
- Version-tracked media (when SOPs are revised, flag outdated visuals)
- Analytics: which training content is most viewed, where do new starters struggle
- Cross-operator comparison (are different shifts performing steps differently?)
- **Goal:** Visual documentation is always current, complete, and improving

---

## 6. GMP & Compliance Considerations

This feature operates in a GMP environment. Key safeguards:

- **No media enters training materials without QA approval** — all uploads pass through a review queue
- **Media is supplementary, not authoritative** — the written SOP remains the controlled document; visual content is a training aid
- **Audit trail** — every upload, approval, rejection, and edit is logged with timestamps and user IDs
- **Data integrity** — uploaded media is checksummed and immutable once approved (ALCOA+ principles)
- **Confidentiality** — AI scans for visible sensitive data (batch numbers, patient info) and flags for review
- **Controlled access** — only trained, authorised personnel can upload; role-based access to training materials
- **Periodic review** — visual content is reviewed alongside SOP revisions to ensure alignment

---

## 7. Impact Summary

| Metric | Before | After |
|---|---|---|
| New starter time to competency | Weeks of shadowing + reading | Days of visual learning + guided practice |
| Knowledge retention when operators leave | Lost | Preserved in media library |
| Training consistency | Varies by trainer/shift | Standardised visual walkthroughs |
| Operator engagement | Passive SOP followers | Active knowledge contributors |
| QA training evidence | Paper sign-off sheets | Visual competency records |
| SOP comprehension | Read and hope | See and understand |

---

## 8. The Vision

> Every procedure performed at this facility, by every operator, becomes a potential training moment captured forever. New starters don't just read about how to set up a bioreactor — they watch the best operators in the building do it, step by step, with tips and context no written SOP could ever provide.
>
> The operators aren't just following procedures. They're building the most comprehensive, living training library in biologics manufacturing — and Vent is the engine that organises, curates, and delivers it.

This is how institutional knowledge stops being institutional and starts being permanent.
