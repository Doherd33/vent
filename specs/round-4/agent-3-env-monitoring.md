# Agent 3 — Environmental Monitoring
# Branch: feature/env-monitoring
# Phase: 3 — Quality Control Lab
# Complexity: M (5 days)

## What to build
Environmental monitoring system for GMP cleanrooms. Every biologics manufacturing facility must maintain a comprehensive environmental monitoring programme per EU GMP Annex 1 (2022 revision, paragraphs 9.1-9.35), FDA Guidance for Industry — Sterile Drug Products Produced by Aseptic Processing (2004), USP <1116>, ISO 14644-1/2/3, and PDA Technical Report No. 13. This module manages the complete EM lifecycle: monitoring location management with cleanroom classification mapping (ISO 5/Grade A through ISO 8/Grade D), sample point justification per risk assessment, monitoring schedule definition with frequency management (continuous, per-batch, daily, weekly, monthly, quarterly), recording of all monitoring types — viable airborne (active air sampling, settle plates), viable surface (contact plates, swabs), personnel monitoring (glove fingertip, gown), and non-viable particle counting (continuous and portable OPC data at >=0.5um and >=5.0um) — with configurable alert and action limits per location per sample type per Annex 1 Tables 1-5, automated excursion detection and classification (alert vs action), excursion investigation with root cause categorisation, batch impact assessment, auto-deviation creation for action limit breaches, organism identification tracking, environmental isolate library maintenance (per Annex 1 paragraph 9.27), and comprehensive trending with statistical process control. AI-native features provide trend detection with moving averages, seasonal pattern analysis, excursion prediction (flag locations trending toward action limits), auto-deviation creation with pre-populated data, contamination source tracing across locations/times, and a real-time cleanroom status dashboard — differentiating Vent from incumbents (MODA-EM, bioMerieux EM Track, LabWare LIMS, PMS FMS) that lack built-in AI for predictive contamination risk and investigation assistance.

## Files to create
- `docs/qc/em.html` (frontend page)
- `server/services/em.service.js` (service layer)
- `server/routes/em.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### em_locations
```sql
CREATE TABLE IF NOT EXISTS em_locations (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id               TEXT UNIQUE NOT NULL,
  name                      TEXT NOT NULL,
  room_name                 TEXT NOT NULL DEFAULT '',
  room_number               TEXT NOT NULL DEFAULT '',
  cleanroom_class           TEXT NOT NULL DEFAULT 'iso-7',
  -- cleanroom_class values: iso-5, iso-6, iso-7, iso-8, unclassified
  grade                     TEXT NOT NULL DEFAULT 'c',
  -- grade values: a, b, c, d, unclassified (EU GMP Annex 1 classification)
  area_type                 TEXT NOT NULL DEFAULT 'clean',
  -- area_type values: aseptic, clean, controlled, uncontrolled
  zone                      TEXT DEFAULT '3',
  -- zone: PDA TR13 zone classification (1=product contact/critical, 2=adjacent to Zone 1, 3=classified area non-contact, 4=outside classified rooms)
  description               TEXT DEFAULT '',
  position                  TEXT DEFAULT 'equipment',
  -- position values: floor, wall, ceiling, equipment, personnel, bench, pass-through, airlock
  position_detail           TEXT DEFAULT '',
  -- position_detail: narrative description of exact sample point (e.g. "Adjacent to filling needle, left side, 15cm from fill point")
  x_coord                   NUMERIC,
  -- x_coord: X position on floor plan (for mapping overlay)
  y_coord                   NUMERIC,
  -- y_coord: Y position on floor plan (for mapping overlay)
  floor_plan_id             TEXT DEFAULT '',
  -- floor_plan_id: reference to floor plan document for this location
  active                    BOOLEAN DEFAULT true,
  risk_level                TEXT DEFAULT 'medium',
  -- risk_level values: high, medium, low (based on proximity to product, historical performance, process criticality)
  justification             TEXT DEFAULT '',
  -- justification: documented reason for monitoring this location (regulatory requirement per Annex 1 para 9.2)
  qualification_ref         TEXT DEFAULT '',
  -- qualification_ref: link to qualification protocol/report that established this monitoring point
  sample_types              JSONB DEFAULT '[]',
  -- sample_types: array of sample types collected at this location ["viable-air","viable-surface-contact","viable-surface-swab","settle-plate","non-viable-particle","personnel-glove","personnel-gown","temperature","humidity","differential-pressure"]
  monitoring_state          TEXT DEFAULT 'in-operation',
  -- monitoring_state values: at-rest, in-operation, both (whether limits apply to at-rest, in-operation, or both states)
  alert_limit_viable_air    NUMERIC,
  -- alert_limit_viable_air: CFU/m3 alert limit for active air sampling at this location
  action_limit_viable_air   NUMERIC,
  -- action_limit_viable_air: CFU/m3 action limit for active air sampling at this location
  alert_limit_viable_surface NUMERIC,
  -- alert_limit_viable_surface: CFU/plate alert limit for contact plates/swabs at this location
  action_limit_viable_surface NUMERIC,
  -- action_limit_viable_surface: CFU/plate action limit for contact plates/swabs at this location
  alert_limit_settle        NUMERIC,
  -- alert_limit_settle: CFU/4hrs alert limit for settle plates at this location
  action_limit_settle       NUMERIC,
  -- action_limit_settle: CFU/4hrs action limit for settle plates at this location
  alert_limit_personnel     NUMERIC,
  -- alert_limit_personnel: CFU/glove alert limit for personnel monitoring at this location
  action_limit_personnel    NUMERIC,
  -- action_limit_personnel: CFU/glove action limit for personnel monitoring at this location
  alert_limit_nonviable_05  NUMERIC,
  -- alert_limit_nonviable_05: particles/m3 alert limit for >=0.5um particles (per Annex 1 Table for this grade)
  action_limit_nonviable_05 NUMERIC,
  -- action_limit_nonviable_05: particles/m3 action limit for >=0.5um particles
  alert_limit_nonviable_50  NUMERIC,
  -- alert_limit_nonviable_50: particles/m3 alert limit for >=5.0um particles
  action_limit_nonviable_50 NUMERIC,
  -- action_limit_nonviable_50: particles/m3 action limit for >=5.0um particles
  date_established          DATE,
  -- date_established: when monitoring at this point began
  created_by                TEXT NOT NULL DEFAULT 'system',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_loc_class ON em_locations(cleanroom_class);
CREATE INDEX IF NOT EXISTS idx_em_loc_grade ON em_locations(grade);
CREATE INDEX IF NOT EXISTS idx_em_loc_area ON em_locations(area_type);
CREATE INDEX IF NOT EXISTS idx_em_loc_zone ON em_locations(zone);
CREATE INDEX IF NOT EXISTS idx_em_loc_active ON em_locations(active);
CREATE INDEX IF NOT EXISTS idx_em_loc_risk ON em_locations(risk_level);
CREATE INDEX IF NOT EXISTS idx_em_loc_room ON em_locations(room_name);
ALTER TABLE em_locations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'em_locations_all') THEN
    CREATE POLICY em_locations_all ON em_locations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### em_readings
```sql
CREATE TABLE IF NOT EXISTS em_readings (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id            TEXT UNIQUE NOT NULL,
  location_id           TEXT NOT NULL REFERENCES em_locations(location_id),
  schedule_id           TEXT DEFAULT '',
  -- schedule_id: FK to em_schedules.schedule_id (which scheduled monitoring event this reading fulfills)
  reading_type          TEXT NOT NULL DEFAULT 'viable-air',
  -- reading_type values: viable-air, viable-surface-contact, viable-surface-swab, settle-plate, non-viable-particle, personnel-glove, personnel-gown, temperature, humidity, differential-pressure
  value                 NUMERIC,
  -- value: primary measurement result (CFU for viable, particles/m3 for non-viable, degrees/Pa/% for environmental)
  unit                  TEXT DEFAULT 'cfu',
  -- unit values: cfu, cfu-per-m3, cfu-per-plate, cfu-per-4hrs, cfu-per-glove, particles-per-m3, degrees-c, percent-rh, pascals
  count_05um            NUMERIC,
  -- count_05um: particle count at >=0.5um per m3 (non-viable particle readings only)
  count_50um            NUMERIC,
  -- count_50um: particle count at >=5.0um per m3 (non-viable particle readings only)
  organism_id           TEXT DEFAULT '',
  -- organism_id: reference to em_organisms table if organism identified
  organism_name         TEXT DEFAULT '',
  -- organism_name: genus species of identified organism (e.g. "Staphylococcus epidermidis")
  organism_genus        TEXT DEFAULT '',
  -- organism_genus: genus only for quick filtering
  gram_stain            TEXT DEFAULT '',
  -- gram_stain values: gram-positive, gram-negative, not-applicable (for non-bacterial)
  morphology            TEXT DEFAULT '',
  -- morphology values: cocci, bacilli, rod, yeast, mold, other
  objectionable         BOOLEAN DEFAULT false,
  -- objectionable: true if organism is classified as objectionable (e.g. S. aureus, P. aeruginosa, B. cepacia)
  particle_size         TEXT DEFAULT '',
  -- particle_size values: 0.5, 5.0, 0.3, 1.0 (which particle size this reading measures, for non-viable)
  sample_volume         NUMERIC,
  -- sample_volume: volume of air sampled in litres (for active air sampling, typically 1000L = 1m3)
  exposure_time         NUMERIC,
  -- exposure_time: exposure duration in minutes (for settle plates, typically 240 min = 4 hours per Annex 1)
  incubation_temp_1     NUMERIC,
  -- incubation_temp_1: first incubation temperature in degrees C (20-25C for fungi/slow-growers per PDA TR13)
  incubation_time_1     NUMERIC,
  -- incubation_time_1: first incubation duration in hours (48-72 hrs per PDA TR13)
  incubation_start_1    TIMESTAMPTZ,
  -- incubation_start_1: start timestamp of first incubation phase
  incubation_end_1      TIMESTAMPTZ,
  -- incubation_end_1: end timestamp of first incubation phase
  incubation_temp_2     NUMERIC,
  -- incubation_temp_2: second incubation temperature in degrees C (30-35C for mesophilic bacteria per PDA TR13)
  incubation_time_2     NUMERIC,
  -- incubation_time_2: second incubation duration in hours (48-72 hrs per PDA TR13)
  incubation_start_2    TIMESTAMPTZ,
  -- incubation_start_2: start timestamp of second incubation phase
  incubation_end_2      TIMESTAMPTZ,
  -- incubation_end_2: end timestamp of second incubation phase
  media_type            TEXT DEFAULT '',
  -- media_type values: tsa, sda, tsa-neutralising, chromogenic, other (TSA = Tryptic Soy Agar, SDA = Sabouraud Dextrose Agar)
  media_lot             TEXT DEFAULT '',
  -- media_lot: agar plate / media lot number for traceability
  instrument_id         TEXT DEFAULT '',
  -- instrument_id: equipment ID of particle counter or air sampler (links to equipment module for calibration traceability)
  surface_area_cm2      NUMERIC,
  -- surface_area_cm2: surface area sampled for contact plates (standard 25 cm2) or swabs
  status                TEXT DEFAULT 'pending',
  -- status values: pending, incubating, reading, within-limit, alert, action, oos, reviewed, approved
  batch_in_progress     TEXT DEFAULT '',
  -- batch_in_progress: batch number of product being manufactured during sampling (for batch impact assessment)
  activity_during_sample TEXT DEFAULT 'in-operation',
  -- activity_during_sample values: at-rest, in-operation, personnel-present, post-cleaning, post-maintenance (contextualises the reading)
  operator_name         TEXT DEFAULT '',
  -- operator_name: name of operator being monitored (for personnel-glove and personnel-gown readings)
  sampled_by            TEXT NOT NULL DEFAULT '',
  sampled_at            TIMESTAMPTZ DEFAULT now(),
  reviewed_by           TEXT DEFAULT '',
  reviewed_at           TIMESTAMPTZ,
  approved_by           TEXT DEFAULT '',
  approved_at           TIMESTAMPTZ,
  deviation_id          TEXT DEFAULT '',
  -- deviation_id: link to deviation record if this reading triggered an excursion investigation
  excursion_type        TEXT DEFAULT 'none',
  -- excursion_type values: none, alert, action (auto-set by comparing value to location limits)
  comments              TEXT DEFAULT '',
  ai_risk_assessment    TEXT DEFAULT '',
  -- ai_risk_assessment: AI-generated risk narrative for this reading in context of location history
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_reading_location ON em_readings(location_id);
CREATE INDEX IF NOT EXISTS idx_em_reading_schedule ON em_readings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_em_reading_type ON em_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_em_reading_status ON em_readings(status);
CREATE INDEX IF NOT EXISTS idx_em_reading_excursion ON em_readings(excursion_type);
CREATE INDEX IF NOT EXISTS idx_em_reading_sampled ON em_readings(sampled_at);
CREATE INDEX IF NOT EXISTS idx_em_reading_batch ON em_readings(batch_in_progress);
CREATE INDEX IF NOT EXISTS idx_em_reading_organism ON em_readings(organism_id);
CREATE INDEX IF NOT EXISTS idx_em_reading_objectionable ON em_readings(objectionable);
ALTER TABLE em_readings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'em_readings_all') THEN
    CREATE POLICY em_readings_all ON em_readings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### em_schedules
```sql
CREATE TABLE IF NOT EXISTS em_schedules (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id           TEXT UNIQUE NOT NULL,
  location_id           TEXT NOT NULL REFERENCES em_locations(location_id),
  reading_type          TEXT NOT NULL DEFAULT 'viable-air',
  -- reading_type values: viable-air, viable-surface-contact, viable-surface-swab, settle-plate, non-viable-particle, personnel-glove, personnel-gown, temperature, humidity, differential-pressure
  frequency             TEXT NOT NULL DEFAULT 'daily',
  -- frequency values: continuous, per-batch, per-shift, daily, weekly, monthly, quarterly, annually (per PDA TR13 and Annex 1 risk-based approach)
  day_of_week           INTEGER,
  -- day_of_week: 0=Sunday through 6=Saturday (for weekly schedules)
  time_of_day           TEXT DEFAULT '',
  -- time_of_day: scheduled collection time in HH:MM format
  during_operations     BOOLEAN DEFAULT true,
  -- during_operations: true if sampling should occur during production operations (in-operation state)
  operator_group        TEXT DEFAULT '',
  -- operator_group: which personnel group performs this monitoring (e.g. "EM Team", "Production Operators")
  sop_reference         TEXT DEFAULT '',
  -- sop_reference: applicable SOP for this sampling activity
  media_type            TEXT DEFAULT '',
  -- media_type: required media for this scheduled sampling (tsa, sda, tsa-neutralising)
  sample_volume         NUMERIC,
  -- sample_volume: required sample volume in litres (for air sampling, e.g. 1000L for 1m3)
  exposure_time         NUMERIC,
  -- exposure_time: required exposure time in minutes (for settle plates, e.g. 240 min = 4 hours)
  next_due_at           TIMESTAMPTZ,
  -- next_due_at: when the next sample is due (auto-calculated based on frequency and last completion)
  last_completed_at     TIMESTAMPTZ,
  -- last_completed_at: timestamp of most recent completed sample fulfilling this schedule
  last_completed_by     TEXT DEFAULT '',
  -- last_completed_by: who performed the most recent scheduled sample
  compliance_count      INTEGER DEFAULT 0,
  -- compliance_count: number of scheduled samples completed on time in current period
  missed_count          INTEGER DEFAULT 0,
  -- missed_count: number of scheduled samples missed in current period
  effective_date        DATE,
  -- effective_date: when this schedule takes effect
  active                BOOLEAN DEFAULT true,
  notes                 TEXT DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_sched_location ON em_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_em_sched_type ON em_schedules(reading_type);
CREATE INDEX IF NOT EXISTS idx_em_sched_freq ON em_schedules(frequency);
CREATE INDEX IF NOT EXISTS idx_em_sched_next ON em_schedules(next_due_at);
CREATE INDEX IF NOT EXISTS idx_em_sched_active ON em_schedules(active);
ALTER TABLE em_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'em_schedules_all') THEN
    CREATE POLICY em_schedules_all ON em_schedules FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### em_organisms
```sql
CREATE TABLE IF NOT EXISTS em_organisms (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organism_id           TEXT UNIQUE NOT NULL,
  genus                 TEXT NOT NULL,
  -- genus: e.g. "Staphylococcus", "Aspergillus", "Bacillus"
  species               TEXT DEFAULT '',
  -- species: e.g. "epidermidis", "niger", "subtilis" (species level ID required for objectionable organisms per Annex 1 para 9.26)
  gram_stain            TEXT DEFAULT '',
  -- gram_stain values: gram-positive, gram-negative, not-applicable
  morphology            TEXT DEFAULT '',
  -- morphology values: cocci, bacilli, rod, yeast, mold, other
  identification_method TEXT DEFAULT '',
  -- identification_method values: maldi-tof, 16s-rrna, api, vitek, phenotypic, other
  source_sample_id      TEXT DEFAULT '',
  -- source_sample_id: reading_id of the sample from which this organism was first isolated
  first_detected_date   DATE NOT NULL,
  last_detected_date    DATE,
  detection_count       INTEGER DEFAULT 1,
  -- detection_count: total number of times this organism has been recovered from the facility
  locations_detected    JSONB DEFAULT '[]',
  -- locations_detected: array of location_ids where this organism has been found
  grades_detected       JSONB DEFAULT '[]',
  -- grades_detected: array of cleanroom grades where this organism has appeared ["a","b","c","d"]
  objectionable         BOOLEAN DEFAULT false,
  -- objectionable: true if classified as objectionable organism requiring enhanced investigation (S. aureus, P. aeruginosa, B. cepacia complex, moulds in Grade A)
  typical_source        TEXT DEFAULT '',
  -- typical_source values: human-skin, human-respiratory, water, soil, air, construction, unknown
  risk_assessment       TEXT DEFAULT '',
  -- risk_assessment: free-text risk evaluation of this organism's significance to the facility
  risk_level            TEXT DEFAULT 'low',
  -- risk_level values: low, medium, high, critical
  notes                 TEXT DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_org_genus ON em_organisms(genus);
CREATE INDEX IF NOT EXISTS idx_em_org_objectionable ON em_organisms(objectionable);
CREATE INDEX IF NOT EXISTS idx_em_org_risk ON em_organisms(risk_level);
CREATE INDEX IF NOT EXISTS idx_em_org_source ON em_organisms(typical_source);
ALTER TABLE em_organisms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'em_organisms_all') THEN
    CREATE POLICY em_organisms_all ON em_organisms FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### em_excursions
```sql
CREATE TABLE IF NOT EXISTS em_excursions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  excursion_id            TEXT UNIQUE NOT NULL,
  reading_id              TEXT NOT NULL REFERENCES em_readings(reading_id),
  location_id             TEXT NOT NULL REFERENCES em_locations(location_id),
  excursion_type          TEXT NOT NULL DEFAULT 'action',
  -- excursion_type values: alert, action
  grade                   TEXT NOT NULL DEFAULT 'c',
  -- grade: cleanroom grade where excursion occurred
  reading_type            TEXT NOT NULL DEFAULT 'viable-air',
  -- reading_type: type of monitoring that triggered the excursion
  result_value            NUMERIC NOT NULL,
  -- result_value: the measured value that exceeded the limit
  limit_value             NUMERIC NOT NULL,
  -- limit_value: the alert or action limit that was exceeded
  limit_type              TEXT NOT NULL DEFAULT 'action',
  -- limit_type values: alert-viable-air, action-viable-air, alert-viable-surface, action-viable-surface, alert-settle, action-settle, alert-personnel, action-personnel, alert-nonviable-05, action-nonviable-05, alert-nonviable-50, action-nonviable-50
  severity                TEXT DEFAULT 'minor',
  -- severity values: minor (Grade C/D alert), moderate (Grade C/D action, Grade B alert), major (Grade B action), critical (any Grade A excursion)
  status                  TEXT DEFAULT 'open',
  -- status values: open, investigating, pending-review, closed
  investigation_summary   TEXT DEFAULT '',
  -- investigation_summary: narrative of root cause investigation
  root_cause              TEXT DEFAULT '',
  -- root_cause values: personnel, hvac-facilities, cleaning-disinfection, equipment, materials, process, media-method, unknown (standardised categories per PDA TR13)
  root_cause_detail       TEXT DEFAULT '',
  -- root_cause_detail: detailed explanation of root cause
  organisms_identified    JSONB DEFAULT '[]',
  -- organisms_identified: array of organism_ids identified during excursion investigation
  batch_impact_assessment TEXT DEFAULT '',
  -- batch_impact_assessment: assessment of impact on associated batch(es) — required for Grade A/B excursions
  batches_affected        JSONB DEFAULT '[]',
  -- batches_affected: array of batch numbers potentially affected by this excursion
  batch_disposition       TEXT DEFAULT '',
  -- batch_disposition values: not-applicable, released, held, rejected, pending-investigation (batch decision based on investigation outcome)
  corrective_actions      TEXT DEFAULT '',
  -- corrective_actions: immediate corrective actions taken
  preventive_actions      TEXT DEFAULT '',
  -- preventive_actions: preventive actions to avoid recurrence
  additional_monitoring   BOOLEAN DEFAULT false,
  -- additional_monitoring: true if enhanced monitoring was implemented at affected location(s)
  monitoring_duration     TEXT DEFAULT '',
  -- monitoring_duration: how long enhanced monitoring will continue (e.g. "2 weeks", "until 3 consecutive clean results")
  recovery_verified       BOOLEAN DEFAULT false,
  -- recovery_verified: true when follow-up sampling confirms location has returned to compliant state
  deviation_id            TEXT DEFAULT '',
  -- deviation_id: FK to deviation record (auto-created for action limit excursions)
  capa_id                 TEXT DEFAULT '',
  -- capa_id: FK to CAPA record (required for Grade A excursions and recurring excursions)
  investigated_by         TEXT DEFAULT '',
  investigated_at         TIMESTAMPTZ,
  reviewed_by             TEXT DEFAULT '',
  reviewed_at             TIMESTAMPTZ,
  closed_by               TEXT DEFAULT '',
  closed_at               TIMESTAMPTZ,
  sla_investigation_due   DATE,
  -- sla_investigation_due: deadline for completing investigation (5 business days for action, 30 days for full closure)
  ai_investigation        TEXT DEFAULT '',
  -- ai_investigation: AI-generated investigation scope recommendation
  ai_root_cause           JSONB DEFAULT '[]',
  -- ai_root_cause: AI-suggested probable root causes ranked by likelihood
  ai_corrective_actions   JSONB DEFAULT '[]',
  -- ai_corrective_actions: AI-suggested corrective actions based on similar past excursions
  created_by              TEXT NOT NULL DEFAULT 'system',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_exc_reading ON em_excursions(reading_id);
CREATE INDEX IF NOT EXISTS idx_em_exc_location ON em_excursions(location_id);
CREATE INDEX IF NOT EXISTS idx_em_exc_type ON em_excursions(excursion_type);
CREATE INDEX IF NOT EXISTS idx_em_exc_status ON em_excursions(status);
CREATE INDEX IF NOT EXISTS idx_em_exc_severity ON em_excursions(severity);
CREATE INDEX IF NOT EXISTS idx_em_exc_grade ON em_excursions(grade);
CREATE INDEX IF NOT EXISTS idx_em_exc_root ON em_excursions(root_cause);
CREATE INDEX IF NOT EXISTS idx_em_exc_deviation ON em_excursions(deviation_id);
CREATE INDEX IF NOT EXISTS idx_em_exc_sla ON em_excursions(sla_investigation_due);
ALTER TABLE em_excursions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'em_excursions_all') THEN
    CREATE POLICY em_excursions_all ON em_excursions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `emLocationId()` -> `EML-1000...9999`
- `emReadingId()` -> `EMR-1000...9999`
- `emScheduleId()` -> `EMS-1000...9999`
- `emOrganismId()` -> `EORG-1000...9999`
- `emExcursionId()` -> `EMEX-1000...9999`

## API Endpoints

### Locations — CRUD
- `POST /em/locations` — create a new monitoring location (includes cleanroom class, grade, zone, position, limits, justification, sample types)
- `GET /em/locations` — list all locations (filter by cleanroom_class, grade, area_type, zone, active, risk_level, room_name)
- `GET /em/locations/:locationId` — single location with recent readings summary, trend snapshot, excursion history, and schedule info
- `PUT /em/locations/:locationId` — update location (limit changes are audit-logged with before/after values for regulatory traceability)

### Readings — CRUD
- `POST /em/readings` — record a new monitoring reading (auto-evaluates against location limits, auto-sets excursion_type, auto-creates excursion record for action limit breaches, auto-creates deviation for action excursions)
- `GET /em/readings` — list readings (filter by location_id, reading_type, status, excursion_type, sampled_at date range, batch_in_progress, organism_id, objectionable, grade)
- `GET /em/readings/:readingId` — single reading with location details and linked excursion/deviation
- `PUT /em/readings/:readingId` — update reading (add organism ID after incubation, update status after review, add colony count after plate reading)

### Reading Workflow
- `POST /em/readings/:readingId/review` — QA review of reading result (sets reviewed_by, reviewed_at). Captures electronic signature per 21 CFR Part 11.10(k).
- `POST /em/readings/:readingId/approve` — final approval of reviewed reading (sets approved_by, approved_at). Required for all viable results before data is trended.
- `POST /em/readings/batch` — bulk record multiple readings (for operators submitting a full monitoring round — multiple locations in one submission)

### Schedules — CRUD
- `POST /em/schedules` — create monitoring schedule for a location/reading_type combination (sets frequency, media requirements, sample volume)
- `GET /em/schedules` — list all schedules (filter by location_id, reading_type, frequency, active, overdue)
- `GET /em/schedules/:scheduleId` — single schedule with compliance history
- `PUT /em/schedules/:scheduleId` — update schedule (frequency changes audit-logged)
- `GET /em/schedule` — get the combined monitoring calendar view (all active schedules with next_due_at, organized by date)
- `GET /em/schedule/overdue` — list all overdue scheduled monitoring activities (next_due_at < now and not completed)
- `GET /em/schedule/compliance` — schedule compliance metrics (completed on time / total due, by location, by grade, by reading_type)

### Organisms — Environmental Isolate Library
- `POST /em/organisms` — add a new organism to the isolate library
- `GET /em/organisms` — list all organisms (filter by genus, objectionable, risk_level, typical_source, grade detected)
- `GET /em/organisms/:organismId` — organism detail with full detection history (all readings where detected, locations, dates, trend)
- `PUT /em/organisms/:organismId` — update organism classification (e.g., mark as objectionable, update risk level)

### Excursions
- `GET /em/excursions` — list all excursions (filter by excursion_type, status, severity, grade, root_cause, location_id, date range)
- `GET /em/excursions/:excursionId` — single excursion with full investigation detail, linked reading, linked deviation/CAPA
- `PUT /em/excursions/:excursionId` — update excursion investigation (add root cause, corrective actions, batch impact)
- `POST /em/excursions/:excursionId/investigate` — begin formal investigation (status: open -> investigating, sets investigated_by, sets sla_investigation_due)
- `POST /em/excursions/:excursionId/review` — submit for QA review (investigating -> pending-review)
- `POST /em/excursions/:excursionId/close` — close excursion (pending-review -> closed). Blocked if: root_cause is empty, investigation_summary is empty, batch_impact_assessment is empty for Grade A/B excursions, or recovery_verified is false.

### Dashboard & Status
- `GET /em/status` — real-time cleanroom status board (each room/zone with traffic-light status based on most recent monitoring data: green=within limits, yellow=alert excursion or trending, red=action excursion or critical). Includes particle counts for Grade A, most recent viable results per location, open excursion count, pending review count.
- `GET /em/stats` — dashboard statistics (total readings this period, excursion rate %, schedule compliance %, open excursions by severity, readings by grade, readings by type, average time to close excursions, Grade A excursion count)
- `GET /em/status/rooms` — room-level summary (one entry per room with aggregate status, location count, latest readings, excursion status)

### Trending
- `GET /em/trends` — facility-wide trending data (aggregate excursion rate over time, by grade, by reading type)
- `GET /em/trends/:locationId` — location-specific trend data (time-series of readings with moving average, alert/action limit lines, excursion markers, statistical summary: mean, median, 95th percentile, max, std dev)
- `GET /em/trends/organisms` — organism detection trending (frequency over time, new organisms, distribution changes)
- `GET /em/trends/comparison` — compare trending between locations (e.g., two filling rooms of the same grade)

### AI Endpoints
- `POST /em/ai/trend-analysis` — AI: analyse trending data for a location or facility-wide. Identify adverse trends, calculate process capability, detect drift toward limits, and generate a narrative assessment with recommendations. Uses moving averages, control chart rules (Nelson rules: 7+ consecutive points on one side of mean, 6+ trending in one direction), and comparison to historical baselines.
- `POST /em/ai/seasonal-patterns` — AI: analyse 12+ months of data to identify seasonal patterns (summer mould increases, winter personnel-flora predominance, construction-related elevations). Correlate patterns with facility events. Generate seasonal risk calendar.
- `POST /em/ai/excursion-prediction` — AI: for each active location, calculate a contamination risk score (Green/Yellow/Orange/Red) based on recent trend direction, proximity to limits, excursion history, organism diversity, and facility events. Flag locations predicted to exceed action limits within the next 2-4 weeks. Provide narrative reasoning per location.
- `POST /em/ai/auto-deviation` — AI: when a reading exceeds an action limit, auto-generate a deviation record pre-populated with: excursion details (location, grade, result vs limit, sample type), affected batches, suggested severity based on grade (critical for Grade A, major for Grade B, moderate for Grade C/D), initial investigation scope, and recommended investigation steps based on the organism type and location history.
- `POST /em/ai/investigate` — AI: given an excursion, generate investigation scope recommendation. Analyse the organism (if viable), location history, concurrent excursions at other locations, facility events, and similar past investigations to suggest: most likely root causes (ranked), specific investigation steps, related locations to check, effective corrective actions from precedent, and batch impact assessment guidance.
- `POST /em/ai/contamination-trace` — AI: correlate excursions across multiple locations and time periods to identify contamination source and transmission pathway. Analyse spatial patterns (adjacent locations, airflow direction), temporal patterns (shift correlation, operator correlation), and organism matching to generate a contamination source hypothesis with recommended verification sampling strategy.
- `POST /em/ai/status-narrative` — AI: generate a natural-language facility health narrative for the cleanroom status dashboard ("All cleanrooms within specification. Note: Filling Room 2 particle counts trending upward over past 3 days — recommend increased surveillance."). Updated on demand or periodically.
- `POST /em/ai/trend-report` — AI: generate a comprehensive EM trend report (monthly/quarterly/annual) with: executive summary, excursion summary, location-by-location trends, organism library update, seasonal analysis, limit adequacy assessment, and recommendations. Structured for QA review and regulatory filing.

## Role Access
- qc (create readings, manage locations, manage schedules, manage organisms, review readings, create excursion investigations, AI endpoints, manage isolate library)
- qa (all QC permissions + approve readings, close excursions, approve limit changes, dashboard access, trend report approval, deviation/CAPA creation from excursions)
- operator (submit readings via batch entry, view own readings, view status board, view schedules — cannot review/approve or modify limits)
- production (view status board, view readings, view excursions — read-only access for batch impact awareness)
- admin (all operations)

### Review and Approval Matrix
- **Reading submission:** qc or operator role
- **Reading review:** qc role (reviewer cannot be the same person who submitted)
- **Reading approval:** qa role (approver cannot be reviewer or submitter — separation of duties per 21 CFR Part 11)
- **Excursion investigation:** qc role
- **Excursion closure:** qa role (must verify root cause identified, corrective actions implemented, recovery verified)
- **Limit changes:** qa role (all limit changes require documented justification and are audit-logged)
- **Schedule changes:** qc or qa role (frequency reductions require qa approval)
- **Organism classification as objectionable:** qa role

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 4)

- **Trend detection with moving averages and control charts** — for each location, calculate and display time-series data with a configurable moving average overlay (default: 10-point window). Apply Nelson rules to detect statistically significant patterns: 1 point beyond 3-sigma (already caught by action limits), 7+ consecutive points on one side of the mean (process shift), 6+ consecutive points trending in one direction (drift), 14+ points alternating up/down (instability). When a Nelson rule is triggered, generate a narrative alert: "Location EML-2045 (Filling Room 1, Grade B) shows 8 consecutive active air sampling results above the mean of 2.1 CFU/m3. This suggests a sustained process shift rather than random variation. Mean has shifted from 2.1 to 4.8 CFU/m3 over the past 3 weeks. Alert limit is 5 CFU/m3 — current trend suggests an alert excursion is likely within 1-2 weeks if the root cause is not addressed. Recommend: review HVAC performance, check HEPA filter differential pressures, and verify personnel gowning compliance at this station."

- **Seasonal pattern analysis** — analyse 12+ months of historical data to detect recurring temporal patterns. Identify: summer mould elevation periods, winter baseline shifts, post-holiday personnel effects, HVAC seasonal performance variations, and construction-activity correlations. Generate a seasonal risk calendar showing which months/weeks historically have elevated contamination risk for each grade and organism type. Output example: "Grade C areas show a consistent 40% increase in mould recovery during June-August over the past 2 years, likely due to increased outdoor spore loads. Recommend: pre-emptive increase in cleaning frequency and disinfectant rotation during summer months. Consider additional mould-specific sampling (SDA plates) at Grade C/D locations from May through September."

- **Excursion prediction (contamination risk scoring)** — for each active monitoring location, calculate a dynamic risk score (0-100 mapped to Green/Yellow/Orange/Red) based on: recent trend direction (improving/stable/worsening: weight 30%), proximity to limits as percentage (weight 25%), excursion frequency in past 6 months (weight 20%), organism diversity trend (weight 10%), facility events correlation (weight 10%), and seasonal risk factor (weight 5%). Provide per-location narrative: "Location EML-1023 risk score: 72 (Orange — Heightened Risk). Active air counts have increased from mean 1.2 to 3.8 CFU/m3 over 4 weeks. Two alert excursions in past month. Predominant organism Micrococcus luteus is consistent with human skin flora. Recommend: review personnel practices, verify gowning compliance, consider additional air sampling at adjacent locations." Flag all Orange/Red locations on the cleanroom status dashboard.

- **Auto-deviation creation** — when a reading exceeds an action limit, automatically create a deviation record in the Deviation Manager module with pre-populated fields: title ("EM Action Limit Excursion — {location_name} — {reading_type}"), description (full excursion details including value, limit, grade, sample type, date/time), severity (auto-set: critical for Grade A, major for Grade B, moderate for Grade C/D), affected batch numbers, linked reading ID and excursion ID. For Grade A excursions: auto-escalate to QA Director, include batch hold recommendation, flag for CAPA creation. Include AI-generated initial investigation scope with suggested root causes and investigation steps.

- **Contamination source tracing** — when excursions occur at multiple locations or an unusual organism is detected, cross-correlate: spatial patterns across the monitoring location map (are excursions clustered? following an airflow path?), temporal patterns (same shift? same operator? same time of day?), organism matching (same organism at multiple locations suggests a common source), and facility event correlation (maintenance, personnel changes, cleaning schedule changes). Generate a contamination source hypothesis: "Bacillus subtilis detected at 3 adjacent Grade C locations (EML-3001, EML-3002, EML-3004) within 48 hours. These locations are downstream of AHU-3 in the air handling system. No detection at upstream locations. Hypothesis: HEPA filter breach or bypass on AHU-3. Recommended verification: smoke study at AHU-3 discharge, HEPA filter integrity test, and additional sampling at upstream locations."

- **Cleanroom status dashboard with AI narrative** — real-time facility-wide view with per-room traffic-light status. AI generates a natural-language health summary that contextualises the data: current status, recent trends, open investigations, and recommended actions. Updated on each dashboard refresh or on-demand. This replaces the typical static particle-count-only displays of legacy FMS systems with an intelligent, context-aware summary.

### Future Enhancements (not Round 4)
- **Anomaly detection in continuous particle data** — real-time pattern recognition in continuous OPC data streams from Grade A zones
- **AI-generated comprehensive trend reports** — monthly/quarterly/annual EM reports with executive summary, statistical analysis, and regulatory-ready formatting
- **Optimal monitoring schedule recommendation** — analyse historical data to recommend frequency adjustments (increase for high-risk locations, reduce for consistently clean locations)
- **BMS/HVAC data correlation** — automated ingestion and correlation of temperature, humidity, and pressure differential data with EM results
- **Gowning qualification tracking** — personnel-specific monitoring history with qualification status management
- **Regulatory compliance readiness check** — AI assessment of EM programme against Annex 1, FDA, and ISO 14644 requirements with gap identification
- **Environmental isolate library intelligence** — AI-powered organism sourcing, distribution mapping, and emergence alerting

## Dependencies
- QC Lab Dashboard (live R3) — EM module sits within the QC department namespace; shared navigation and role model
- Deviation Manager (live R1) — auto-creation of deviations from EM action limit excursions
- CAPA Tracker (live R2) — auto-creation of CAPAs from Grade A excursions and recurring excursions
- Equipment Logbook (live R1) — particle counter and air sampler calibration status linked to EM readings via instrument_id

## Wiring in server/index.js
```js
// Require at top
const emRoutes = require('./routes/em');
const { makeEmService } = require('./services/em.service');

// Instantiate service
const emService = makeEmService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'em.html': 'qc/em.html',

// Mount routes
emRoutes(app, { auth: requireAuth, emService });
```

## Frontend Page: docs/qc/em.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qc/qc-lab.html`. Top section: cleanroom status board with room-level traffic lights. Tab navigation between views: Dashboard, Readings, Locations, Schedules, Excursions, Organisms, Trends.

### Features
1. **Cleanroom Status Board** (top, always visible)
   - Facility-wide overview: each room displayed as a card with traffic-light status (green/yellow/red)
   - Grade A rooms show live particle count (most recent non-viable reading) with percentage of action limit
   - Each room card shows: room name, grade badge (color-coded: Grade A=blue, B=green, C=amber, D=grey), latest reading status, open excursion count
   - Clicking a room card filters the readings list to that room
   - AI-generated facility health narrative at the top ("All cleanrooms within specification" or "1 active excursion in Buffer Prep — investigation in progress")
   - Summary bar at bottom: total locations, open excursions, pending reviews, schedule compliance %, readings today

2. **Readings List** (left panel, when Readings tab active)
   - Filterable by: reading_type (viable-air, settle-plate, viable-surface-contact, viable-surface-swab, non-viable-particle, personnel-glove, personnel-gown), location, grade (a, b, c, d), status (pending, incubating, reading, within-limit, alert, action, reviewed, approved), excursion_type (none, alert, action), date range, batch_in_progress, organism present, objectionable organism
   - Search by reading ID, location name, organism name
   - Color coding: green (within-limit), amber (alert), red (action/oos), grey (pending/incubating)
   - Excursion indicator: pulsing red dot for action excursions, amber dot for alert
   - Sort by: sampled_at (default newest first), value, status, grade
   - Grade badge on each row (A=blue, B=green, C=amber, D=grey)

3. **Reading Detail** (right panel)
   - Header: reading ID, location name, grade badge, reading type badge, status badge, excursion badge (if any)
   - **Sample Information panel:** location details (room, zone, grade, position), sampled_by, sampled_at, activity_during_sample, batch_in_progress, instrument_id
   - **Result panel:** primary value with unit, count_05um and count_50um (for particle readings), alert limit, action limit, percentage of action limit (progress bar visualization), excursion classification
   - **Incubation Tracking panel** (visible for viable readings): dual-temperature tracking — Phase 1 temp/start/end, Phase 2 temp/start/end, media type, media lot. Visual timeline of incubation progress.
   - **Organism panel** (visible when organism detected): genus, species, gram stain, morphology, objectionable flag, link to isolate library entry, identification method
   - **Review/Approval section:** reviewer name + timestamp + e-signature meaning, approver name + timestamp + e-signature meaning. Review button (for qc role), Approve button (for qa role). Per 21 CFR Part 11.10(k).
   - **Linked Records:** deviation link (clickable), excursion link (clickable), schedule link
   - **AI Risk Assessment panel:** AI-generated contextual risk narrative for this reading
   - **Audit trail timeline:** immutable log of all actions (21 CFR Part 11 compliant)

4. **Location List** (left panel, when Locations tab active)
   - Filterable by: cleanroom_class, grade, area_type, zone, active, risk_level, room_name
   - Each row shows: location ID, name, room, grade badge, zone, risk level indicator, sample types icons, latest reading status
   - Floor plan view toggle: switch from list to a schematic view showing location markers on a room layout (uses x_coord, y_coord)

5. **Location Detail** (right panel)
   - Header: location ID, name, grade badge, zone badge, risk level badge, active status
   - **Position panel:** room name, room number, area type, position, position detail (narrative), x/y coordinates
   - **Limits panel:** table showing all configured alert/action limits by sample type (viable air, viable surface, settle plate, personnel, non-viable 0.5um, non-viable 5.0um). Edit button for qa role.
   - **Sample Types panel:** list of monitoring types performed at this location with associated schedule info
   - **Recent Readings panel:** last 10 readings at this location with mini-trend sparkline
   - **Trend Chart panel:** time-series of readings at this location with alert/action limit lines, moving average overlay, and excursion markers
   - **Excursion History panel:** all excursions at this location with status and root cause
   - **Justification panel:** documented reason for monitoring this location, qualification reference
   - **AI Risk Score:** current contamination risk score (Green/Yellow/Orange/Red) with narrative reasoning

6. **Schedule View** (left panel, when Schedules tab active)
   - Calendar-style view showing upcoming monitoring activities by date
   - Color-coded by grade (A=blue, B=green, C=amber, D=grey)
   - Overdue items highlighted in red with "OVERDUE" badge
   - List view alternative: all schedules as a table with location, reading type, frequency, next due, last completed, compliance status
   - Filter by: location, reading_type, frequency, active, overdue only
   - Schedule compliance metrics at top: % on-time overall, % on-time by grade

7. **Excursion List** (left panel, when Excursions tab active)
   - Filterable by: excursion_type (alert, action), status (open, investigating, pending-review, closed), severity (minor, moderate, major, critical), grade, root_cause, location
   - Search by excursion ID, location name, deviation ID
   - Severity color coding: critical=red, major=orange, moderate=amber, minor=grey
   - SLA countdown: days remaining to investigation deadline, overdue items highlighted red
   - Sort by: created_at, severity, status, sla_investigation_due

8. **Excursion Detail** (right panel)
   - Header: excursion ID, severity badge, status badge, excursion type badge, grade badge
   - **Excursion Summary panel:** location, grade, reading type, result vs limit, date/time, linked reading
   - **Investigation panel:** root cause (dropdown of standard categories), root cause detail (free text), investigation summary (free text), investigated by/at
   - **Organism panel:** organisms identified during investigation (link to isolate library)
   - **Batch Impact panel** (required for Grade A/B): batch impact assessment narrative, affected batches list, batch disposition decision
   - **Corrective Actions panel:** immediate corrective actions, preventive actions, enhanced monitoring status and duration
   - **Recovery panel:** recovery verified checkbox, additional sampling results
   - **Linked Records:** deviation link, CAPA link
   - **AI Investigation panel:** AI-generated investigation scope, probable root causes (ranked), suggested corrective actions, similar past excursions with outcomes
   - **Status workflow:** Open -> Investigating -> Pending Review -> Closed (with approval gates)
   - **Audit trail timeline**

9. **Organism Library** (left panel, when Organisms tab active)
   - List of all organisms in the environmental isolate library
   - Filterable by: genus, objectionable, risk_level, typical_source, grade detected
   - Search by genus, species
   - Objectionable organisms highlighted with red indicator
   - Each row shows: organism ID, genus/species, source, detection count, risk level, last detected date

10. **Organism Detail** (right panel)
    - Header: organism ID, genus species, risk level badge, objectionable flag
    - **Identification panel:** gram stain, morphology, identification method, source sample
    - **Detection History panel:** time-series of detections showing frequency over time
    - **Distribution panel:** list of locations where detected, with grades (shows if organism is localised or widespread)
    - **Risk Assessment panel:** risk level, typical source, free-text risk assessment
    - **Notes panel:** additional characterisation notes

11. **Trends View** (left panel, when Trends tab active)
    - Location selector: pick a location to view its trend
    - Reading type selector: filter by viable-air, settle-plate, non-viable-particle, etc.
    - Date range selector: last 7 days, 30 days, 90 days, 6 months, 12 months, custom
    - **Trend Chart:** time-series line chart with:
      - Individual reading data points (color-coded by excursion status)
      - Alert limit line (dashed amber)
      - Action limit line (dashed red)
      - Moving average line (solid blue, configurable window)
      - Mean line (dotted grey)
    - **Statistics panel:** mean, median, 95th percentile, max, min, std dev, excursion rate
    - **Comparison view:** select two locations to overlay their trends on the same chart
    - AI "Analyse Trends" button: generates narrative trend analysis with recommendations

12. **Create Reading Modal**
    - Location dropdown (searchable, shows grade badge)
    - Reading type dropdown (viable-air, viable-surface-contact, viable-surface-swab, settle-plate, non-viable-particle, personnel-glove, personnel-gown)
    - Value (numeric input — auto-evaluates against limits on entry, shows amber/red warning if exceeding alert/action)
    - For non-viable: count_05um and count_50um fields
    - For viable: organism name (optional — may be added later after incubation), media type, media lot
    - For personnel: operator name
    - Sample volume, exposure time (pre-populated from schedule if fulfilling a scheduled sample)
    - Instrument ID
    - Activity during sample (at-rest, in-operation, personnel-present, post-cleaning, post-maintenance)
    - Batch in progress (optional)
    - Sampled at (datetime, defaults to now)
    - Comments
    - If value exceeds action limit: prominent warning banner "This reading exceeds the action limit. An excursion record and deviation will be auto-created upon submission."

13. **Batch Reading Entry** (accessible from Readings tab)
    - For operators completing a monitoring round: enter multiple readings in a single submission
    - Select monitoring round (by schedule or ad-hoc)
    - Table format: one row per location/reading_type, pre-populated from schedule
    - Enter values in each row, auto-evaluation against limits in real-time
    - Submit all readings at once

14. **Stats Dashboard** (visible in Dashboard tab)
    - Total readings this period (with comparison to previous period)
    - Excursion rate: action excursions / total readings (target: < 1%)
    - Alert rate: alert excursions / total readings (target: < 5%)
    - Grade A excursion count (target: 0) — highlighted red if > 0
    - Open excursions by severity (critical/major/moderate/minor)
    - Schedule compliance: % of scheduled samples completed on time
    - Pending reviews: readings awaiting QA review/approval
    - Average excursion investigation time (days)
    - Readings by grade (bar chart)
    - Readings by type (bar chart)
    - Excursion trend over time (line chart — monthly excursion rate)

15. **Grade A Excursion Banner**
    - When any Grade A action excursion is open, display a prominent banner across the top of the page: "GRADE A EXCURSION ACTIVE — [Location] — [Reading Type] — [Value] vs limit [Limit]. Investigation required within 4 hours. Deviation: [DEV-XXXX]. Batch impact assessment required."
    - Pulsing red border, cannot be dismissed until excursion status is at least "investigating"

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

### Grade Color Coding
- Grade A: `#3b82f6` (blue) — aseptic/critical
- Grade B: `#22c55e` (green) — background to Grade A
- Grade C: `#f59e0b` (amber) — less critical
- Grade D: `#6b7280` (grey) — controlled area
- Unclassified: `#374151` (dark grey)

### Excursion Status Colors
- Within Limit: `--accent` (green)
- Alert: `#f59e0b` (amber)
- Action: `#ef4444` (red)
- Under Investigation: `#f97316` (orange)
- Closed: `#6b7280` (grey)

## Architecture Rules
- Service factory pattern: `module.exports = { makeEmService }`
- Use `requireAuth` on all read routes; `requireRole('qc')` on write routes for readings, locations, schedules, organisms; `requireRole('qa')` on approval routes and excursion closure
- Operator role: can submit readings and view status board but cannot review/approve/modify limits
- Use `auditLog()` for all create/update/delete/review/approve/close operations — every state change must be logged
- Audit trail entries must include: action, userId, timestamp, and the full before/after state diff for the changed record (21 CFR Part 11.10(e))
- E-signatures on reading reviews and approvals must capture: printed name (from user profile), timestamp, and signature meaning (review/approval) per 21 CFR Part 11.10(k)
- Auto-evaluate reading values against location limits on creation — auto-set excursion_type (none/alert/action) by comparing value to corresponding alert/action limit for the reading_type at the location
- Auto-create em_excursions record when reading exceeds action limit — auto-populate severity based on grade (critical for Grade A, major for Grade B, moderate for Grade C/D)
- Auto-set sla_investigation_due on excursion creation: 5 business days from creation date for action excursions; immediate (4 hours) for Grade A excursions
- Auto-create deviation (via Deviation Manager API if available, or store deviation_id for manual linkage) when action limit is exceeded — pre-populate with excursion details per auto-deviation AI feature
- Auto-require CAPA creation for all Grade A excursions and for locations with 3+ excursions in 6 months
- Auto-calculate next_due_at on schedule when a reading is submitted that fulfills a scheduled monitoring event — based on frequency (daily: +1 day, weekly: +7 days, monthly: +30 days, quarterly: +90 days)
- Block excursion closure if: root_cause is empty, investigation_summary is empty, or (for Grade A/B) batch_impact_assessment is empty or recovery_verified is false
- Enforce reviewer/approver separation of duties: sampler !== reviewer !== approver (per 21 CFR Part 11)
- Limit changes must be audit-logged with before/after values and documented justification (limits should be reviewed annually per USP <1116>)
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on reviews/approvals with printed name + timestamp + meaning
- EU GMP Annex 1 (2022) compliant: continuous monitoring support for Grade A, configurable limits per Annex 1 Tables, organism identification tracking, environmental isolate library, risk-based monitoring programme, trend analysis
- ISO 14644-1/2/3 compliant: cleanroom classification data model, monitoring plan support, classification-to-routine-monitoring traceability
- USP <1116> compliant: configurable alert/action limits, statistical limit-setting support, organism identification strategy, data-driven limit review
- PDA TR13 compliant: zone-based location model (Zones 1-4), dual-temperature incubation tracking, monitoring frequency matrix support, root cause categorisation

## Reference files (copy patterns from)
- `docs/qc/qc-lab.html` — layout, styling, split-panel pattern, tab navigation
- `server/services/qc-lab.service.js` — service factory with AI features and Claude prompt templates
- `server/routes/qc-lab.js` — route pattern with auth guards and role-based access
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
- `server/services/deviation-mgr.service.js` — deviation creation pattern (for auto-deviation integration)
