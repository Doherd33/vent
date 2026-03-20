# Mom Test Interviews — Vent Customer Discovery

> The Mom Test rule: Never ask "would you use this?" Ask about their real behaviour, real problems, and real workarounds. If they're complaining about something they already do — that's signal.

---

## Interview 1: BPA (Bioprocess Associate) — Upstream Operations

### Context
Operator with 2-3 years experience. Runs 1000L perfusion bioreactors on continental shifts. Uses MasterControl for SOPs/PBRs, DeltaV for automation, paper/hybrid batch records for execution.

---

### Questions & Responses

**Q: Talk me through what happens at the start of your shift. What's the first thing you do?**

> "Come in, get gowned, go to handover. The outgoing lead gives us a rundown — what's running, what stage everything is at, anything that happened. Then I check my assignment on the whiteboard, go to my area, check DeltaV to see where things are at, and pick up the batch record from where the last person left off."

**Follow-up: How much of that handover do you actually retain?**

> "Maybe 70%. If it's a quiet shift I get most of it. If there's a lot going on, I catch the big stuff and hope the rest doesn't matter. Sometimes I find out 4 hours in that something was flagged on the last shift that nobody told me about."

---

**Q: When was the last time you needed to check an SOP during a process step?**

> "Last week. I was doing a filter integrity test on the ATF and the acceptance criteria changed in the last revision. I knew roughly what it was but I wasn't going to guess on something like that."

**Follow-up: How did you find it?**

> "Logged into MasterControl, searched for the SOP number — I knew the number so that was grand. Opened the PDF, it's like 35 pages. Ctrl+F for 'acceptance criteria.' Found it on page 22. Took maybe 10 minutes start to finish."

**Follow-up: What if you didn't know the SOP number?**

> "Then you're searching by keyword and MasterControl throws up 40 results and half of them are superseded versions. That can take 20 minutes easy. Sometimes I just ask someone instead."

---

**Q: Tell me about the last time something unexpected happened on shift.**

> "pH probe on BR-2 started drifting. DeltaV alarmed, I went over, checked the reading — it was reading 7.15 but the offline BGA sample said 6.98. So the probe was off by 0.17. That's outside the acceptable drift range."

**Follow-up: What did you do?**

> "Called the shift lead. He came over, agreed it was a real drift, not a calibration artefact. We had to raise a deviation, do an offline calibration, recalibrate the probe, and document the whole thing. The actual fix took 20 minutes. The paperwork took two hours."

**Follow-up: Where did you look for the calibration procedure?**

> "I know how to calibrate a pH probe — I've done it hundreds of times. But I still had to reference the SOP because the deviation requires you to document which SOP you followed. So I had to go find it in MasterControl, open it, note the SOP number and revision, and reference it in the deviation. It's not that I needed the SOP to do the work — I needed it to prove I did the work correctly."

---

**Q: What's the most frustrating part of your day?**

> "The batch record. I'm running a bioreactor, monitoring the process, doing sampling, watching the trends — and then I have to stop every 30 minutes and write numbers on paper. Time, pH, DO2, temperature, VCD, viability — all of which are already on the DeltaV screen. I'm literally transcribing from one place to another. And if I make a transcription error — wrong time, wrong decimal point — that's a deviation. I'm creating risk by doing the documentation that's supposed to reduce risk."

---

**Q: How do you find out what happened on previous batches with the same equipment?**

> "I don't, really. Unless it was recent and I remember it, or unless someone mentions it in handover. If I wanted to look up the deviation history for BR-2, I'd have to go into MasterControl, search deviations, filter by equipment — if it's even tagged to equipment, which half the time it isn't. The system doesn't connect things to equipment. It connects things to document numbers."

---

**Q: When you're on night shift and something happens that you haven't seen before, what do you do?**

> "Call the shift lead. If he doesn't know, he calls engineering on-call. If they don't answer — which happens — we make a judgment call and document it. Sometimes you're standing there at 3am with a decision to make and no one to ask. You go with your gut and hope it's right."

**Follow-up: What would help in that moment?**

> "If I could just ask something — like, has this happened before? What did we do last time? What does the SOP say about this specific scenario? — and get an actual answer, not a 40-page PDF. Just tell me what to do. That would change everything."

---

**Q: How do you feel about the training you received?**

> "I read the SOPs and signed off. Then I shadowed someone for a few shifts. The shadowing was useful — that's where you actually learn. The read-and-sign was a compliance exercise. I didn't retain half of what I read because it was 300 pages across 15 SOPs with no context for why things are done a certain way."

---

### Key Signals (What Vent Solves)

| Signal | Vent Feature |
|--------|-------------|
| "Took 10-20 minutes to find the right SOP section" | Spatial search — tap equipment, get the relevant SOP instantly |
| "I transcribe from DeltaV to paper — creating risk" | Equipment nodes show process data; voice capture for observations |
| "MasterControl doesn't connect things to equipment" | Knowledge graph grounded to equipment, not document numbers |
| "At 3am with no one to ask" | Charlie voice AI — grounded answers at any hour |
| "The actual fix took 20 minutes, the paperwork took 2 hours" | AI-assisted deviation pipeline — capture, then document |
| "Read-and-sign training with no context" | Equipment-linked training with contextual understanding |

---

---

## Interview 2: Shift Lead — Manufacturing Operations

### Context
11 years experience. Manages 8-12 BPAs per shift across upstream, downstream, buffer prep, and seed. Responsible for all operations, deviations, and batch output during the shift. Uses MasterControl, DeltaV, whiteboard, WhatsApp, and 11 years of memory.

---

### Questions & Responses

**Q: Walk me through how you manage a typical shift.**

> "Handover first — the outgoing lead tells me what's going on. I check the whiteboard for assignments, adjust if needed based on who's actually shown up. Then I walk the floor — check every area, every active process, talk to the BPAs, look at the DeltaV screens. After that it's reactive — I go where I'm needed. Someone calls me, something alarms, a BPA has a question. I try to walk the floor every 45 minutes to an hour but some shifts I barely get back to certain areas."

**Follow-up: How do you keep track of everything that's happening?**

> "In my head, mostly. I have a notebook I carry — I write down the critical stuff. What batch is where, what's pending, any issues. DeltaV gives me process data but only if I'm standing in front of the right screen in the right room. There's no single place I can look and see the full picture of my shift."

---

**Q: How much of your shift is spent answering BPA questions?**

> "Honestly? Probably 30-40%. Some of it is legitimate — decisions that need my sign-off or my experience. But a lot of it is stuff they should be able to answer themselves if they had access to the right information. 'What's the acceptance criteria for this?' 'Has this happened before?' 'Can I use this buffer if the pH is 0.02 off?' They're not stupid — they just can't find the answers quickly enough in MasterControl, so they call me instead."

**Follow-up: What happens when you're dealing with one issue and three other questions queue up?**

> "They wait. Or they make a decision without me and hope it's right. Or they ask another BPA who might know. That's the bit that keeps me up — the questions I didn't get asked because I was busy somewhere else. Those are the ones that turn into deviations."

---

**Q: Tell me about shift handover. How does that work?**

> "Fifteen minutes. I talk through everything — active batches, where they're at, any issues, any pending QA actions, who's doing what, what's coming up on the next shift. I try to be thorough but I always forget something. The formal handover log exists but nobody fills it in properly — it's a template in a Word doc and it takes 20 minutes to complete. So we do it verbally and hope for the best."

**Follow-up: Has anything ever been missed in handover?**

> "Yeah. A few months ago, a BPA on my shift noticed a slight colour change in a media bag but wasn't sure if it was significant. I noted it mentally but forgot to mention it in handover. The next shift used that media, and it turned out it was contaminated. If the handover had captured it properly, they would have QC'd it first. That one cost us."

---

**Q: How do you handle deviations?**

> "First, I assess — is this critical or minor? Critical means I'm on the phone to QA immediately and we're stopping the process. Minor means I note it, we continue, and I raise it in MasterControl after. The problem is that 'after' sometimes means end of shift, and by then I've got 6 other things to document. The deviation form in MasterControl takes 30-45 minutes to fill in properly — description, immediate actions, impact assessment, supporting documents. That's 45 minutes I don't have during a shift."

**Follow-up: Do all deviations get raised?**

> "Honestly? No. Minor stuff that should be logged sometimes doesn't because the overhead is too high. A BPA sees something slightly off, mentions it to me, I say 'keep an eye on it.' If it doesn't get worse, we move on. That's a problem because those minor observations are often the early signal for bigger issues. But the system punishes you for raising things — more paperwork, more investigation time, more scrutiny. So people under-report."

---

**Q: How do you know which BPAs are qualified to run which equipment?**

> "I have a training matrix — it's a spreadsheet. I check it at the start of each shift when I'm doing assignments. But it's not always up to date. Sometimes a BPA has completed their training but the matrix hasn't been updated yet. Sometimes someone is 'qualified' on paper but I know they're not ready to run unsupervised. The formal system and the reality are two different things."

**Follow-up: How do you handle that gap?**

> "I pair them. I put the less experienced person with someone senior. Or I assign them to lower-risk tasks and keep the critical operations for people I trust. But that means I'm doing resource allocation in my head based on knowledge that isn't in any system. If I'm off sick and someone else covers my shift, they don't have that context. They look at the training matrix, see everyone is 'qualified,' and assign based on availability. That's when mistakes happen."

---

**Q: What's the worst part of your job?**

> "Being the single point of failure. Everything runs through me. If I'm sharp, the shift is good. If I'm tired, if I miss something, if I'm in the wrong room at the wrong time — things go wrong. And there's no system backing me up. It's me, my notebook, and 11 years of knowing where the bodies are buried. That shouldn't be how a €50 million facility operates."

---

**Q: If you could change one thing about how you work, what would it be?**

> "One screen where I can see everything. Every reactor, every purification step, every buffer prep — status, alarms, batch stage, who's running it. I spend half my shift walking between rooms and checking screens just to build a picture that should be available in one place. Give me that, and I'd catch problems before they become deviations instead of after."

---

### Key Signals (What Vent Solves)

| Signal | Vent Feature |
|--------|-------------|
| "No single place to see the full picture of my shift" | Spatial floor map — every process, every equipment, one screen |
| "30-40% of my shift answering questions BPAs could answer themselves" | Charlie AI gives BPAs instant answers — reduces dependency on shift lead |
| "Handover is verbal and things get missed" | Equipment nodes retain state between shifts — the floor IS the handover |
| "Deviations take 45 minutes to document" | AI-assisted deviation pipeline — observation capture in seconds, full documentation assisted |
| "Minor observations go unreported" | Low-friction observation capture — voice or tap, 30 seconds, done |
| "Training matrix and reality are two different things" | Equipment-linked training status, OJT tracking, qualification visibility per equipment |
| "I'm the single point of failure" | Vent distributes knowledge across the team — the system backs up the shift lead |
| "One screen where I can see everything" | That's literally the hub. That's the product. |

---

## Summary: What Both Interviews Validate

1. **MasterControl is a compliance tool, not an operations tool** — finding information takes too long and nothing is connected to equipment
2. **DeltaV is trusted for process data** — but it's room-by-room, screen-by-screen, with no unified view
3. **Knowledge lives in people's heads** — especially the shift lead's. When they're unavailable, the floor is exposed
4. **Documentation creates risk instead of reducing it** — transcription errors, time pressure, under-reporting
5. **Night shifts are the highest-risk, lowest-support environment** — exactly where Vent's value is highest
6. **The shift lead's #1 ask is a single view of the floor** — that's the hub. Word for word.
