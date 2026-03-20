# Agent 5 — Cell Bank Management
# Branch: feature/inoc-cell-bank
# Phase: 5 — Inoculation Suite
# Complexity: L (7 days)

## What to build
Cell bank management system for biologics manufacturing. Track Master Cell Banks (MCB) and Working Cell Banks (WCB) stored at ultra-low temperatures (-150C to -196C liquid nitrogen). Manage individual vial inventory with location tracking (freezer, rack, box, position), freeze/thaw transaction history, passage number tracking, viability data, and certificate of analysis linkage. Cell banks are the starting material for every biologic product — traceability and inventory accuracy are critical. Includes chain of custody, expiry management, and rebanking planning.

**Regulatory basis:** ICH Q5A(R2) (viral safety), ICH Q5B (expression construct analysis), ICH Q5D (cell substrate derivation/characterisation), FDA Guidance on Cell Substrate Characterization (2010), EU GMP Annex 2 Section 7 (cell bank systems). System must enforce split storage across 2+ locations, passage number limits, qualification gating before production use, and full testing traceability per the three-tier cell bank model (MCB -> WCB -> EPC).

## Files to create
- `docs/inoc/cell-banks.html` (frontend page)
- `server/services/cell-bank.service.js` (service layer)
- `server/routes/cell-bank.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### cell_banks
```sql
CREATE TABLE IF NOT EXISTS cell_banks (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id             TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  bank_type           TEXT NOT NULL DEFAULT 'wcb',
  cell_line           TEXT NOT NULL DEFAULT '',
  clone_id            TEXT DEFAULT '',
  product             TEXT DEFAULT '',
  status              TEXT DEFAULT 'active',
  passage_number      INTEGER DEFAULT 0,
  max_passage_limit   INTEGER DEFAULT 60,
  parent_bank_id      TEXT DEFAULT '',
  total_vials         INTEGER DEFAULT 0,
  available_vials     INTEGER DEFAULT 0,
  withdrawn_vials     INTEGER DEFAULT 0,
  destroyed_vials     INTEGER DEFAULT 0,
  reserved_vials      INTEGER DEFAULT 0,
  quarantine_vials    INTEGER DEFAULT 0,
  storage_temp        TEXT DEFAULT '-196C_LN2',
  storage_location    TEXT DEFAULT '',
  backup_storage_location TEXT DEFAULT '',
  freezer_id          TEXT DEFAULT '',
  date_banked         DATE,
  expiry_date         DATE,
  viability_at_bank   NUMERIC(5,2),
  vcd_at_bank         NUMERIC(10,2),
  coa_reference       TEXT DEFAULT '',
  -- Testing status fields (ICH Q5A/Q5B/Q5D)
  mycoplasma_status   TEXT DEFAULT 'pending',
  sterility_status    TEXT DEFAULT 'pending',
  identity_status     TEXT DEFAULT 'pending',
  adventitious_status TEXT DEFAULT 'pending',
  karyology_status    TEXT DEFAULT 'pending',
  retrovirus_status   TEXT DEFAULT 'pending',
  genetic_stability_status TEXT DEFAULT 'pending',
  -- Qualification gating (EU GMP Annex 2)
  qualification_status TEXT DEFAULT 'pending',
  qualification_approved_by TEXT DEFAULT '',
  qualification_approved_date TIMESTAMPTZ,
  -- Banking protocol references
  banking_sop_reference TEXT DEFAULT '',
  freezing_protocol   TEXT DEFAULT '',
  stability_protocol  TEXT DEFAULT '',
  -- Deviation linkage (EU GMP Annex 2 deviation/OOS management)
  deviation_id        TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  ai_depletion_est    TEXT DEFAULT '',
  ai_rebank_rec       TEXT DEFAULT '',
  created_by          TEXT NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cell_banks_type ON cell_banks(bank_type);
CREATE INDEX IF NOT EXISTS idx_cell_banks_status ON cell_banks(status);
CREATE INDEX IF NOT EXISTS idx_cell_banks_cell_line ON cell_banks(cell_line);
CREATE INDEX IF NOT EXISTS idx_cell_banks_product ON cell_banks(product);
CREATE INDEX IF NOT EXISTS idx_cell_banks_expiry ON cell_banks(expiry_date);
CREATE INDEX IF NOT EXISTS idx_cell_banks_qualification ON cell_banks(qualification_status);
ALTER TABLE cell_banks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_banks_all') THEN
    CREATE POLICY cell_banks_all ON cell_banks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

**New columns rationale:**
- `max_passage_limit` — validated maximum passage number from MCB to production (ICH Q5D). Default 60 covers typical CHO lines. Alert when withdrawals would exceed this.
- `backup_storage_location` — split storage is required by ICH Q5D; at least 2 geographically separate locations.
- `reserved_vials` / `quarantine_vials` — track vials in non-available states for accurate inventory accounting.
- `retrovirus_status` / `genetic_stability_status` — required by ICH Q5A and Q5B respectively. Not covered by existing 5 testing fields.
- `qualification_status` / `qualification_approved_by` / `qualification_approved_date` — formal QA release gating per EU GMP Annex 2. Bank cannot be used for production until qualification_status = 'qualified'.
- `banking_sop_reference` / `freezing_protocol` / `stability_protocol` — document references required by ICH Q5D for full traceability.
- `deviation_id` — link to existing deviation-mgr module for excursion/OOS investigation (EU GMP Annex 2).

### cell_bank_vials
```sql
CREATE TABLE IF NOT EXISTS cell_bank_vials (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vial_id           TEXT UNIQUE NOT NULL,
  bank_id           TEXT NOT NULL REFERENCES cell_banks(bank_id),
  vial_number       INTEGER NOT NULL,
  status            TEXT DEFAULT 'available',
  freezer_id        TEXT DEFAULT '',
  rack              TEXT DEFAULT '',
  box               TEXT DEFAULT '',
  position          TEXT DEFAULT '',
  volume_ml         NUMERIC(6,2) DEFAULT 1.0,
  cell_count        NUMERIC(12,0),
  viability         NUMERIC(5,2),
  passage_number    INTEGER DEFAULT 0,
  freeze_date       DATE,
  thaw_date         DATE,
  thawed_by         TEXT DEFAULT '',
  reserved_for      TEXT DEFAULT '',
  reserved_date     TIMESTAMPTZ,
  quarantine_reason TEXT DEFAULT '',
  quarantine_date   TIMESTAMPTZ,
  destroyed_date    DATE,
  destroyed_by      TEXT DEFAULT '',
  destruction_reason TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cb_vials_bank ON cell_bank_vials(bank_id);
CREATE INDEX IF NOT EXISTS idx_cb_vials_status ON cell_bank_vials(status);
CREATE INDEX IF NOT EXISTS idx_cb_vials_freezer ON cell_bank_vials(freezer_id);
CREATE INDEX IF NOT EXISTS idx_cb_vials_location ON cell_bank_vials(rack, box, position);
CREATE INDEX IF NOT EXISTS idx_cb_vials_freeze_date ON cell_bank_vials(freeze_date);
ALTER TABLE cell_bank_vials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_vials_all') THEN
    CREATE POLICY cell_bank_vials_all ON cell_bank_vials FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

**Vial status lifecycle** (6 states):
| State | Description | Allowed transitions |
|---|---|---|
| `available` | In storage, bank is qualified, ready for use | -> reserved, withdrawn, quarantine, destroyed |
| `reserved` | Reserved for upcoming withdrawal (not yet physically removed) | -> withdrawn, available (release) |
| `withdrawn` | Physically removed from storage | -> used (complete), available (return — rare) |
| `used` | Successfully thawed and used in production/testing | Terminal state |
| `destroyed` | Destroyed per approved destruction protocol | Terminal state |
| `quarantine` | Held pending investigation or testing (e.g., storage excursion, suspect contamination) | -> available (release), destroyed |

**New vial fields rationale:**
- `reserved_for` / `reserved_date` — track which batch/transaction a vial is reserved for (supports multi-day production scheduling).
- `quarantine_reason` / `quarantine_date` — document why a vial was quarantined (links to deviation investigation).
- `freeze_date` index — supports FIFO ordering for withdrawal suggestions.

### cell_bank_transactions
```sql
CREATE TABLE IF NOT EXISTS cell_bank_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id    TEXT UNIQUE NOT NULL,
  bank_id           TEXT NOT NULL REFERENCES cell_banks(bank_id),
  vial_id           TEXT DEFAULT '',
  transaction_type  TEXT NOT NULL DEFAULT 'withdraw',
  quantity          INTEGER DEFAULT 1,
  purpose           TEXT DEFAULT '',
  batch_number      TEXT DEFAULT '',
  requested_by      TEXT NOT NULL,
  approved_by       TEXT DEFAULT '',
  approved_date     TIMESTAMPTZ,
  performed_by      TEXT DEFAULT '',
  performed_date    TIMESTAMPTZ,
  witness           TEXT DEFAULT '',
  status            TEXT DEFAULT 'requested',
  from_location     TEXT DEFAULT '',
  to_location       TEXT DEFAULT '',
  post_thaw_viability NUMERIC(5,2),
  post_thaw_vcd     NUMERIC(10,2),
  time_out_of_storage_minutes INTEGER,
  chain_of_custody  JSONB DEFAULT '[]',
  temperature_log   JSONB DEFAULT '[]',
  e_signature       JSONB DEFAULT '{}',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cbt_bank ON cell_bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_cbt_type ON cell_bank_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cbt_status ON cell_bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cbt_batch ON cell_bank_transactions(batch_number);
CREATE INDEX IF NOT EXISTS idx_cbt_date ON cell_bank_transactions(performed_date);
ALTER TABLE cell_bank_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_transactions_all') THEN
    CREATE POLICY cell_bank_transactions_all ON cell_bank_transactions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

**New transaction fields rationale:**
- `witness` — two-person verification for GMP vial withdrawals (best practice per EU GMP Annex 2 access control requirements).
- `time_out_of_storage_minutes` — critical for cryogenic materials; track how long vials are outside controlled storage during transport.
- `e_signature` — 21 CFR Part 11 Subpart C electronic signature data. JSONB structure: `{ signer, meaning, timestamp, method }`. Required on approval and completion actions.

### cell_bank_testing
```sql
CREATE TABLE IF NOT EXISTS cell_bank_testing (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id         TEXT UNIQUE NOT NULL,
  bank_id         TEXT NOT NULL REFERENCES cell_banks(bank_id),
  test_type       TEXT NOT NULL,
  test_method     TEXT DEFAULT '',
  test_date       DATE,
  result          TEXT DEFAULT 'pending',
  report_reference TEXT DEFAULT '',
  performed_by    TEXT DEFAULT '',
  reviewed_by     TEXT DEFAULT '',
  reviewed_date   TIMESTAMPTZ,
  status          TEXT DEFAULT 'scheduled',
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_bank ON cell_bank_testing(bank_id);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_type ON cell_bank_testing(test_type);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_status ON cell_bank_testing(status);
ALTER TABLE cell_bank_testing ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_testing_all') THEN
    CREATE POLICY cell_bank_testing_all ON cell_bank_testing FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

**Why a separate testing table:** The cell_banks table has summary status flags (mycoplasma_status, sterility_status, etc.) for quick display. This table stores individual test records — date, method, result, reviewer — enabling: (a) multiple test rounds per bank (initial + stability retesting), (b) audit trail per test, (c) automated compliance checking against the testing matrix. The summary flags on cell_banks are updated when test records are reviewed.

**Testing matrix reference** (determines which test_type values are required per bank_type):

| test_type | MCB | WCB | EPC | Method | Typical timeline |
|---|---|---|---|---|---|
| `sterility` | Required | Required | Required | USP <71> / Ph. Eur. 2.6.1 | 14-21 days |
| `mycoplasma` | Required | Required | Required | USP <63> culture + PCR/NAT | 28 days (culture) |
| `identity` | Required | Required | Recommended | STR profiling, species-specific PCR | 5-10 days |
| `karyology` | Required | Recommended | Required | G-banding, FISH | 2-4 weeks |
| `adventitious_virus_in_vitro` | Required | Required | Required | 28-day detector cell culture | 28-42 days |
| `adventitious_virus_in_vivo` | Required | Not required | Not required | Suckling mouse, embryonated egg | 4-6 weeks |
| `retrovirus_em` | Required | Not required | Required | Transmission electron microscopy | 2-4 weeks |
| `retrovirus_infectivity` | Required | Not required | Required | Mus dunni co-culture | 4-6 weeks |
| `reverse_transcriptase` | Required | Recommended | Required | PERT assay | 1-2 weeks |
| `bovine_virus_panel` | If applicable | Not required | Not required | 9 CFR 113.47 equivalent | 4-6 weeks |
| `porcine_virus_panel` | If applicable | Not required | Not required | Porcine parvovirus, CSFV | 4-6 weeks |
| `genetic_stability` | Required | Recommended | Required | Restriction mapping, sequencing | 2-4 weeks |

The service layer should auto-generate the required test records when a new cell bank is created, based on bank_type and the matrix above.

## ID Generators
Add to `server/lib/ids.js`:
- `cellBankId()` -> `CB-1000...9999`
- `cellBankVialId()` -> `CBV-1000...9999`
- `cellBankTransactionId()` -> `CBT-1000...9999`
- `cellBankTestId()` -> `CBTEST-1000...9999`

## API Endpoints
### Cell Banks
- `POST /cell-banks` — create a new cell bank record. Auto-generate required test records based on bank_type and testing matrix. If bank_type is 'wcb', parent_bank_id is required and must reference an active MCB.
- `GET /cell-banks` — list all (filter by bank_type, status, cell_line, product, qualification_status, expiry date range)
- `GET /cell-banks/:bankId` — single cell bank with vial inventory, transaction history, and testing records
- `PUT /cell-banks/:bankId` — update cell bank record
- `GET /cell-banks/:bankId/inventory` — vial inventory with location map and availability
- `POST /cell-banks/:bankId/retire` — retire a cell bank (status: active -> retired)
- `GET /cell-banks/:bankId/lineage` — return full genealogy tree (parent MCB, sibling WCBs, child WCBs) with vial counts and status at each level
- `POST /cell-banks/:bankId/qualify` — QA bank qualification/release. Requires role 'qa'. Validates all required tests are 'pass' before allowing qualification. Records qualification_approved_by, qualification_approved_date, and e_signature. Bank must be qualified before vials can be withdrawn for production.

### Vials
- `POST /cell-banks/:bankId/vials` — register vials (bulk: specify count, auto-generate vial numbers)
- `GET /cell-banks/:bankId/vials` — list all vials for a bank (filter by status, location)
- `PUT /cell-banks/:bankId/vials/:vialId` — update vial (location, status)
- `POST /cell-banks/:bankId/vials/:vialId/destroy` — destroy a vial with reason
- `POST /cell-banks/:bankId/vials/:vialId/reserve` — reserve a vial for an upcoming withdrawal (status: available -> reserved). Records reserved_for (batch number or transaction reference).
- `POST /cell-banks/:bankId/vials/:vialId/quarantine` — place vial in quarantine with reason (status: available -> quarantine). Links to deviation_id if applicable.
- `POST /cell-banks/:bankId/vials/:vialId/release` — release vial from reserved or quarantine back to available

### Testing
- `GET /cell-banks/:bankId/tests` — list all test records for a bank
- `PUT /cell-banks/:bankId/tests/:testId` — update test record (result, report reference, reviewer). When all required tests pass, auto-update qualification_status to 'ready_for_review'.
- `POST /cell-banks/:bankId/tests` — add a test record (for stability retesting or additional tests)

### Transactions
- `POST /cell-banks/:bankId/withdraw` — request vial withdrawal (creates transaction, status: requested). Validates bank qualification_status is 'qualified'. FIFO auto-suggestion of oldest available vials.
- `POST /cell-banks/:bankId/deposit` — deposit vials (rebanking)
- `GET /cell-banks/:bankId/transactions` — transaction history
- `GET /cell-banks/transactions/:txnId` — single transaction detail
- `PUT /cell-banks/transactions/:txnId` — update transaction (approve, record performance, add post-thaw data)
- `POST /cell-banks/transactions/:txnId/approve` — approve withdrawal request. Requires e_signature. Validates passage_number + seed train passages would not exceed max_passage_limit.
- `POST /cell-banks/transactions/:txnId/complete` — mark transaction as completed with post-thaw viability data, witness, and time_out_of_storage_minutes. Flag if post_thaw_viability < 70% or > 10% below banking viability.

### Dashboard & AI
- `GET /cell-banks/stats` — dashboard stats (total banks by type/status, total vials available, withdrawals this month, upcoming expiries, banks with incomplete testing, split storage compliance %)
- `POST /cell-banks/:bankId/ai/depletion` — AI: predict inventory depletion timeline
- `POST /cell-banks/:bankId/ai/rebank` — AI: suggest rebanking timeline based on usage rate and remaining inventory
- `POST /cell-banks/ai/expiry-alerts` — AI: generate expiry and near-expiry alerts across all banks
- `POST /cell-banks/ai/usage-optimization` — AI: analyse vial usage patterns and suggest optimisations
- `POST /cell-banks/ai/viability-trend` — AI: analyse post-thaw viability trends across banks, flag declining banks
- `GET /cell-banks/compliance-check` — AI: regulatory readiness scan across all banks (testing completeness, split storage, qualification status, passage limits)

## Role Access
- operator (withdraw requests, view inventory, record transactions)
- qa (all operations, approve withdrawals, qualify banks, retire banks, review tests, view audit trail)
- msat (all operations, create banks, manage inventory, rebanking)

## AI Features (use Anthropic Claude via service dependency)

### P0 — Must Have (build in this round)

- **Predict inventory depletion** — analyse historical withdrawal rate, planned production schedule, and remaining vial count to forecast when each cell bank will be depleted. Provide a timeline with confidence interval and alert thresholds (e.g., "6 months at current rate, 3 months if production increases"). Input: total vials at banking, current available vials, all withdrawal transactions with dates/quantities. Model: calculate rolling average withdrawal rate (3-month and 6-month windows), project linear depletion, apply safety stock threshold (max of 10% original count or 10 vials). Output: projected depletion date, recommended rebanking trigger date (depletion date minus 6-month qualification lead time), confidence range. **No competitor offers this — Benchling, Signals, BioTracker, and LIMS tools all lack AI depletion prediction.**

- **Expiry alerts** — scan all cell banks and vials for upcoming expiry dates. Generate prioritised alert list with recommended actions (extend with stability data, accelerate usage, plan re-qualification, or destroy). Categorise by urgency: expired, < 3 months, < 6 months, < 12 months. Cross-reference with inventory levels to recommend the most efficient action per bank.

### P1 — High Priority (build in this round)

- **Suggest rebanking timelines** — based on depletion predictions, current passage numbers, and qualification testing lead times (typically 3-6 months), recommend when to initiate rebanking activities. Factor in MCB-to-WCB expansion timelines (4-8 weeks), banking event (1 week), qualification testing (3-6 months), and QA review (2-4 weeks). Total lead time: 4-8 months. If recommended start date is already past: urgent alert. If < 3 months away: warning. If < 6 months: planning alert.

- **Post-thaw viability trending** — analyse post-thaw viability data across all withdrawals from each bank. Flag when: (a) viability falls below configurable threshold (default 70%), (b) viability drops > 10% below banking viability, (c) a downward trend is detected over successive withdrawals (may indicate storage degradation or freezer temperature excursion). Output: trend chart data points, alert text, recommended investigation actions.

### P2 — Medium Priority (build in this round)

- **Vial usage optimisation** — analyse withdrawal patterns (which banks are drawn from most, partial box usage, suboptimal storage organisation) and recommend inventory management improvements. Flag banks with low viability trends or inconsistent post-thaw recovery. Specifically detect: (a) drawing from multiple WCB lots when one is nearly depleted (should finish one first), (b) FIFO violations (using newer vials before older ones), (c) inconsistent post-thaw viability suggesting operator technique issues. **No competitor offers AI-driven usage pattern analysis.**

- **Compliance readiness check** — scan all cell banks and flag: incomplete testing panels, missing CoAs, unqualified banks in active use, banks without split storage, passage numbers approaching limits, expired banks still marked active. Output: traffic-light summary per bank (green/amber/red) with specific action items. Designed for audit preparation.

## Regulatory Compliance Features (built into service logic)

These are not AI features — they are deterministic validation rules enforced by the service layer:

1. **Qualification gating** — withdrawals for production purpose are blocked unless bank qualification_status = 'qualified'. Enforced at the `/withdraw` endpoint.
2. **Passage limit enforcement** — on withdrawal approval, calculate passage_number + estimated seed train passages. Warn if approaching max_passage_limit, block if would exceed it.
3. **Split storage validation** — on bank creation, warn if backup_storage_location is empty. Dashboard shows split storage compliance %.
4. **FIFO enforcement** — withdrawal auto-suggestion always orders by freeze_date ascending. If operator selects a non-FIFO vial, log the override with justification.
5. **Testing completeness check** — qualification endpoint validates all required tests (per bank_type and testing matrix) have result = 'pass' before allowing qualification.
6. **Post-thaw viability alert** — on transaction completion, if post_thaw_viability < 70% or > 10% below viability_at_bank, auto-flag for investigation.
7. **E-signature capture** — approval and qualification actions require e_signature JSONB with signer, meaning ("I approve this withdrawal" / "I certify this bank meets qualification criteria"), and timestamp. Per 21 CFR Part 11 Subpart C.

## Dependencies
- Equipment Logbook (live R1) — link freezers/LN2 storage to equipment records for temperature monitoring and maintenance
- Deviation Manager (live R1) — link deviation_id on cell_banks and quarantined vials for excursion/OOS investigation

## Wiring in server/index.js
```js
// Require at top
const cellBankRoutes = require('./routes/cell-bank');
const { makeCellBankService } = require('./services/cell-bank.service');

// Instantiate service
const cellBankService = makeCellBankService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'cell-banks.html': 'inoc/cell-banks.html',

// Mount routes
cellBankRoutes(app, { auth: requireAuth, cellBankService });
```

## Frontend Page: docs/inoc/cell-banks.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Cell Bank List** (left panel)
   - Filterable by bank type (mcb, wcb), status (active, qualified, quarantine, retired, expired), cell line, product, qualification_status
   - Search by bank ID, name, cell line, clone ID
   - Bank type badges (MCB=purple, WCB=blue)
   - Status color coding (active=green, qualified=teal, quarantine=gold, retired=grey, expired=red)
   - Qualification badge (qualified=green check, pending=gold clock, failed=red X)
   - Available vial count displayed prominently
   - Expiry warning indicator (red if < 3 months, gold if < 6 months)
   - Low inventory warning (red if < 10% available)
   - Split storage indicator (red warning if backup_storage_location is empty)

2. **Cell Bank Detail** (right panel)
   - Header: bank ID, name, bank type badge, status badge, qualification badge, cell line, product
   - Bank info: clone ID, passage number, max passage limit (with visual bar showing current vs. limit), date banked, expiry date, storage temp, storage location, backup storage location
   - Parent bank link (for WCBs derived from MCBs)
   - Inventory summary: total vials, available, reserved, withdrawn, quarantine, destroyed (with segmented progress bar)
   - Vial location map: visual grid showing freezer -> rack -> box -> position with color-coded availability (available=green, reserved=blue, quarantine=gold, empty=dark)
   - **Testing panel** — table showing all test types with status badges (pass=green, fail=red, pending=grey, in_progress=blue), test date, method, reviewer. Shows required vs. optional tests based on bank_type. "All tests passed" indicator when ready for qualification.
   - **Qualification section** — current qualification_status with approve button (QA role only). Shows qualification_approved_by and date when qualified. Blocked until all required tests pass.
   - CoA reference link
   - Viability data at banking (VCD, viability %)
   - **Post-thaw viability trend chart** — line chart plotting post_thaw_viability from all completed transactions for this bank, with banking viability as reference line and 70% alert threshold. Highlights declining trend if detected.
   - Banking protocol references (SOP, freezing protocol, stability protocol)
   - Transaction history timeline (withdrawals, deposits, destructions)
   - AI panels: depletion forecast (timeline chart with projected depletion date and rebanking trigger date), rebanking recommendation, usage optimisation suggestions, compliance status
   - Audit trail timeline

3. **Lineage View** (tab or expandable section in detail panel)
   - Visual tree diagram showing MCB -> WCB relationships
   - Each node shows: bank_id, name, vial counts (available/total), status, qualification_status
   - Highlights single points of failure (e.g., only one MCB for a product with low vial count)
   - Click any node to navigate to that bank's detail view

4. **Create Cell Bank Modal**
   - Name, bank type (MCB, WCB)
   - Cell line, clone ID, product
   - Passage number, max passage limit (default 60 for MCB, auto-inherit from parent MCB for WCB)
   - Parent bank ID (for WCB — dropdown of active, qualified MCBs)
   - Date banked, expiry date
   - Storage temperature (-150C, -196C LN2)
   - Storage location (freezer ID, initial rack/box)
   - Backup storage location (prompted with warning if left empty — "ICH Q5D requires split storage across 2+ locations")
   - Total vials to register
   - Viability at banking (%), VCD at banking
   - Volume per vial (mL), cell count per vial
   - Banking SOP reference, freezing protocol reference
   - CoA reference
   - Notes

5. **Withdraw Vial Modal**
   - Bank selection (if not already in context)
   - Qualification check — if bank is not qualified, show warning and block withdrawal for production purpose
   - Number of vials to withdraw
   - Purpose (production, testing, reference, transfer, destruction)
   - Batch number (if for production)
   - Passage limit check — display current passage_number and max_passage_limit, warn if production use would approach or exceed limit
   - Requested by (auto-filled)
   - Select specific vials from location grid (optional — or auto-select from oldest first with FIFO badge)
   - If non-FIFO selection, prompt for justification
   - Witness field (second person verification)
   - Notes

6. **Record Post-Thaw Data Modal** (after withdrawal completion)
   - Post-thaw viability (%) — with visual alert if < 70% or > 10% below banking viability
   - Post-thaw VCD
   - Time out of storage (minutes)
   - Thaw method notes
   - Witness confirmation
   - Temperature log entries (optional JSON)
   - Chain of custody entries
   - E-signature capture (signer name, meaning statement, timestamp)

7. **Vial Inventory Tab**
   - Full vial list for selected bank: vial number, location (freezer/rack/box/position), status (with color-coded badges including reserved and quarantine), freeze date
   - Visual storage map: interactive grid showing box layout with colour-coded vials
   - Bulk operations: relocate vials, destroy multiple vials, quarantine vials (with reason), release from quarantine
   - Location search: find vials by freezer, rack, box

8. **Stats Dashboard** (top)
   - Total cell banks by type (MCB/WCB)
   - Total available vials across all banks
   - Withdrawals this month
   - Banks expiring within 6 months
   - Banks with low inventory (< 10 vials)
   - Banks pending qualification (unqualified count)
   - Banks without split storage (compliance gap count)
   - Incomplete testing panels count
   - Recent transaction activity

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeCellBankService }`
- Use `requireAuth` middleware on all routes; use `requireRole('qa')` on approval/qualification operations, `requireRole('msat')` on bank creation
- Use `auditLog()` for all create/update/withdraw/destroy/approve/qualify operations — cell bank traceability is critical for GMP
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on approvals and qualifications
- Vial inventory auto-updates: on withdrawal, decrement available_vials and increment withdrawn_vials; on destruction, decrement available_vials and increment destroyed_vials; on reserve, decrement available_vials and increment reserved_vials; on quarantine, decrement available_vials and increment quarantine_vials; on release, reverse the appropriate counters
- FIFO principle: suggest oldest vials first for withdrawal (by freeze_date). Log justification if operator overrides FIFO order.
- Qualification gating: block production withdrawals from unqualified banks
- Passage limit enforcement: warn/block when withdrawals would exceed max_passage_limit
- Auto-generate test records on bank creation per testing matrix and bank_type

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `docs/inoc/incubators.html` — inoculation department page pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
