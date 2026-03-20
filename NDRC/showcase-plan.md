# Vent — Showcase Day Plan

> Date: Wednesday 29 April 2026, 12:30-3:00pm
> Location: RDI Hub, Killorglin, Co. Kerry
> Format: 3-minute pitch + live demo, Google Slides

---

## The Vision

Tony Stark walks into the lab. Everything lights up. The system knows who he is, what's happening, what needs attention. He talks to it. It responds with context. The interface is the room itself.

Now put that on a pharmaceutical manufacturing floor.

The operator walks onto the floor. The floor knows who they are, what shift it is, what's running, what needs attention. They interact with the equipment and the system responds with intelligence, not documents.

That's Vent. Jarvis for biologics.

---

## The 3-Minute Structure

### 0:00 - 0:30 | The Problem (words, no screen)

"Pharma operators run €50M production floors using 5 disconnected systems, paper batch records, and WhatsApp groups. Finding one SOP section takes 20 minutes. The shift lead carries the entire floor in his head. When he's not there, the floor is blind."

### 0:30 - 2:15 | The Demo (live, on screen)

Open the hub. The 3D floor is there. Equipment is alive. The operator interacts with it like Stark interacts with his lab.

**Beat 1: The floor lights up**
- Bioreactors, chromatography columns, buffer prep stations. Everything has status.
- The shift lead sees the whole floor at a glance. No walking room to room. No checking 4 screens.
- "This is what a shift lead sees when they log in. One screen. Everything."

**Beat 2: Tap a bioreactor**
- Everything connected to BR-2 fans out. SOPs, batch records, deviations, training status, maintenance history.
- Not a search. Not a menu. Just... there. Grounded to the equipment.
- "This is what MasterControl can't do. Everything connected to this bioreactor, in one tap."

**Beat 3: Something's wrong**
- A deviation flag on BR-2. pH probe drift detected.
- Tap it. The system shows: what happened, precedent from previous batches, what the SOP says, and drafts the deviation report.
- "What takes 2 hours of paperwork today, Vent does in 30 seconds."

**Beat 4: Ask it a question**
- "Has this happened before on BR-2?"
- The system responds with a grounded answer from actual facility data. Not generic AI. An answer that knows this floor, this equipment, this batch history.
- "At 3am on a night shift, with no one to call, the operator has an answer in seconds."

### 2:15 - 3:00 | The Market (words, one slide)

"Ireland has 90+ biopharma manufacturing sites. Every one of them has the same problems. We're testing with our own upstream team at a biopharma CDMO. We know the floor because we work on it.

CDMOs first. Mid-size biopharma second. Enterprise later.

30 sites at €50K. €1.5M ARR in 3 years.

We're looking for pilot partners and investment to scale beyond our first site."

---

## Demo Requirements

### What must work flawlessly

| Element | Current State | Needs |
|---------|--------------|-------|
| 3D floor with equipment | Three.js hub exists | Polish. Equipment needs to feel alive (status indicators, glow, colour-coding) |
| Tap equipment -> info panel | Hub cards exist | Fan-out animation showing connected data (SOPs, PBRs, deviations, training) |
| Deviation flag + pipeline | Observation -> deviation -> CAPA pipeline works | Wire it into the visual. Flag on equipment, tap to see, draft report |
| AI question/answer | Charlie voice agent + SOP query agent exist | Grounded response displayed in the UI. "Has this happened before?" with real answer |
| Overall feel | Functional but rough | Needs to feel like the future. Smooth, fast, cinematic |

### What we don't need for the demo
- User authentication / login (just start on the floor)
- Full CRUD for all 30 modules
- Mobile responsiveness
- Real-time data integration
- Multi-site support

### The bar
The audience should watch the demo and feel like they've seen something that doesn't exist anywhere else. Not a dashboard. Not a document management system. A spatial intelligence layer that makes the operator feel like they have superpowers.

---

## 5-Week Sprint Plan

### Week 1 (Now - 23 March): Lock the Demo Flow
- [ ] Audit current codebase: what works, what's broken, what's missing
- [ ] Define the exact click path for the demo (every screen, every interaction)
- [ ] Get floor schematics / layout reference for the 3D scene
- [ ] Research Luna.ai for 3D asset generation
- [ ] Checkpoint call with Lavanya (Tue 24 March) - walk her through the plan

### Week 2 (24 - 30 March): Build the Visual
- [ ] 3D floor scene: equipment positioned from schematics
- [ ] Equipment status indicators (colour, glow, animation)
- [ ] Tap-to-inspect interaction: info panel with connected data
- [ ] Deviation flag visual on equipment
- [ ] First draft of 350-word pitch script
- [ ] **Midpoint Meetup (Fri 27 March, Kerry)** - first impression with panel

### Week 3 (31 March - 6 April): Wire the Intelligence
- [ ] Connect tap-to-inspect to real data (SOPs, PBRs, deviations from Supabase)
- [ ] Deviation pipeline: flag on equipment -> tap -> AI-drafted report
- [ ] "Has this happened before?" query grounded in facility data
- [ ] Charlie AI response displayed in the UI (not just voice)
- [ ] Demo flow working end-to-end

### Week 4 (7 - 13 April): Polish and Script
- [ ] Visual polish: transitions, animations, loading states
- [ ] Pitch script finalised (3 minutes, timed)
- [ ] Google Slides deck created (minimal - the demo IS the pitch)
- [ ] Record practice runs with Loom, share with Lavanya
- [ ] Financial model / metrics slide

### Week 5 (14 - 28 April): Rehearse and Ship
- [ ] Dry run with Lavanya / team lead
- [ ] Fix anything that breaks
- [ ] Backup plan (recorded demo video in case of tech failure)
- [ ] Practice delivery (timing, energy, narrative)
- [ ] Final polish
- [ ] **Showcase Day: Wed 29 April**

---

## The Pitch Script (Draft)

> To be refined through Weeks 2-5. This is the skeleton.

Pharma operators run fifty million euro production floors using five disconnected systems, paper batch records, and WhatsApp groups. Finding one SOP section takes twenty minutes. The shift lead carries the entire floor in his head. When he's not there, the floor is blind.

I know this because I work on that floor. I've spent two years listening to my colleagues. The same frustrations, every single shift.

[DEMO STARTS]

This is Vent. This is what an operator sees when they walk onto the floor.

Every piece of equipment. Live status. One screen.

[Tap bioreactor]

Everything connected to this bioreactor. SOPs, batch records, deviations, training records, maintenance history. Not a search. Not a document management system. Intelligence, grounded to the equipment.

[Deviation flag]

Something's wrong. pH probe drift on BR-2. The system shows me what happened, what the precedent is, and drafts the deviation report. What takes two hours today, Vent does in thirty seconds.

[Ask question]

"Has this happened before on BR-2?" The system knows. Not a generic AI answer. An answer grounded in this facility's actual data.

At 3am on a night shift, with no one to call, the operator has an answer in seconds.

[DEMO ENDS]

Ireland has ninety biopharma manufacturing sites with the same problems. We're testing with our own team at a CDMO. We know the floor because we work on it.

CDMOs first. Mid-size second. Enterprise later. Thirty sites at fifty K. One point five million ARR in three years.

We're looking for pilot partners and investment to scale beyond our first site.

---

## Key Decisions Still Needed

1. **Schematics**: What floor layout are we modelling? Your actual site or a generic upstream suite?
2. **Luna.ai**: What assets do we need? Bioreactors, chromatography columns, buffer vessels, centrifuges?
3. **Data**: Do we seed Supabase with realistic demo data or use actual anonymised data?
4. **Voice or text**: Does the "ask a question" moment use Charlie's voice, or is it typed with a visual response?
5. **Backup**: Pre-recorded demo video as fallback?
