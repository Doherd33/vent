// ── Data: process parameters, equipment docs, document content, AI query responses ──

export var PROCESS_DATA = {
    'BR': {
      stages: {
        'N-1': {
          day: 8, totalDays: 14,
          vcd: '18.2', viability: '97.1', titer: '0.42',
          ph: '7.01', dO2: '45', temp: '37.0',
          perfusionRate: '1.2', cellDensity: '18.2e6',
          feedRate: '3.8', bleedRate: '1.1'
        },
        'N': {
          day: 22, totalDays: 40,
          vcd: '42.8', viability: '95.3', titer: '1.85',
          ph: '6.98', dO2: '42', temp: '36.5',
          perfusionRate: '2.4', cellDensity: '42.8e6',
          feedRate: '7.2', bleedRate: '2.8'
        }
      }
    },
    'FEED TANK': {
      volume: '1,420L', maxVolume: '2,000L', pctFull: 71,
      media: 'CD CHO + 8g/L Glucose',
      lastRefill: '2h 14m ago',
      flowRate: '3.8 L/hr',
      temp: '4.0',
      status: 'FEEDING'
    },
    'BLEED TANK': {
      volume: '1,180L', maxVolume: '2,000L', pctFull: 59,
      contents: 'Spent media + cells',
      lastDrain: '6h ago',
      flowRate: '2.8 L/hr',
      temp: '22.0',
      status: 'COLLECTING'
    },
    'ATF': {
      type: 'ATF6',
      fiberCount: 3000,
      poreSize: '0.2 um',
      pressure: { feed: '0.8 bar', retentate: '0.3 bar', permeate: '0.1 bar' },
      flowRate: '12.5 L/min',
      exchangeRate: '1.0/min',
      status: 'RUNNING',
      hoursRun: 528,
      integrity: 'PASS'
    },
    'SU FILTER': {
      type: 'Depth filter capsule',
      campaignDay: 22, campaignMax: 40,
      dP: '0.4 bar', dPMax: '1.5 bar',
      throughput: '840L', throughputMax: '1,500L',
      status: 'IN-USE'
    },
    'HARVEST': {
      volume: '320L', maxVolume: '500L', pctFull: 64,
      turbidity: '12 NTU',
      temp: '18.0',
      ph: '7.0',
      status: 'COLLECTING',
      feedingTo: 'Protein A Column'
    },
    'PROTEIN A': {
      resin: 'MabSelect SuRe LX',
      columnVol: '5.0L',
      cycles: 142, maxCycles: 200,
      phase: 'ELUTION',
      yield: '92.3%',
      hcp: '< 50 ppm',
      pressure: '0.3 MPa'
    },
    'ION EXCHANGE': {
      resin: 'Capto Q ImpRes',
      columnVol: '3.2L',
      cycles: 88, maxCycles: 150,
      phase: 'LOADING',
      purity: '99.1%',
      aggregates: '0.3%',
      pressure: '0.2 MPa'
    },
    'UF/DF': {
      membrane: '30 kDa PES',
      area: '2.5 m²',
      phase: 'DIAFILTRATION',
      concentration: '45 g/L',
      diavolumes: '6 / 8',
      tmp: '1.2 bar',
      flux: '28 LMH'
    },
    'FILL TANK': {
      volume: '85L', maxVolume: '200L', pctFull: 43,
      product: 'Bulk Drug Substance',
      concentration: '45 g/L',
      temp: '5.0',
      status: 'FILLING',
      batchId: 'WXB-2026-0312'
    },
    'SEED BR': {
      stages: {
        'N-1': {
          day: 8, totalDays: 14,
          vcd: '18.2', viability: '97.1', titer: '0.42',
          ph: '7.01', dO2: '45', temp: '37.0',
          perfusionRate: 'N/A', cellDensity: '18.2e6',
          feedRate: '0.8', bleedRate: '0'
        },
        'N': {
          day: 0, totalDays: 0,
          vcd: '\u2014', viability: '\u2014', titer: '\u2014',
          ph: '\u2014', dO2: '\u2014', temp: '\u2014',
          perfusionRate: '\u2014', cellDensity: '\u2014',
          feedRate: '\u2014', bleedRate: '\u2014'
        }
      }
    },
    'MEDIA PREP': {
      volume: '2,800L', maxVolume: '4,000L', pctFull: 70,
      media: 'CD CHO + 8g/L Glucose',
      lastRefill: 'In progress',
      flowRate: '\u2014',
      temp: '37.0',
      status: 'MIXING'
    },
    'MEDIA HOLD': {
      volume: '1,600L', maxVolume: '2,000L', pctFull: 80,
      media: 'CD CHO (sterile filtered)',
      lastRefill: '4h ago',
      flowRate: '5.0 L/min transfer',
      temp: '4.0',
      status: 'HOLDING'
    },
    'PARTS WASHER': {
      type: 'Belimed WD 290',
      cycle: 'Standard glassware',
      temp: '93',
      duration: '45 min',
      status: 'RUNNING',
      currentLoad: 'Bioreactor probes + sampling ports'
    },
    'AUTOCLAVE': {
      type: 'Getinge GSS 6713',
      cycle: 'Wrapped goods — 121°C',
      pressure: '1.1 bar',
      duration: '20 min sterilise + 30 min dry',
      status: 'COOLING',
      currentLoad: 'Tubing sets + connectors'
    },
    'PARTS RACK': {
      items: '~24 items',
      status: 'IN USE',
      lastAudit: '2026-03-12',
      notes: 'Organised by equipment type and batch'
    },
    'LAB BENCH': {
      type: 'Stainless steel bench',
      status: 'IN USE',
      notes: 'pH meter, conductivity, osmometer, scales'
    },
    'PH METER': {
      type: 'Mettler Toledo SevenExcellence',
      lastCal: '2026-03-13',
      nextCal: '2026-03-20',
      status: 'ONLINE'
    },
    'OSMOMETER': {
      type: 'Advanced Instruments OsmoPRO',
      lastCal: '2026-03-12',
      nextCal: '2026-03-19',
      status: 'ONLINE'
    },
    'SCALES': {
      type: 'Sartorius Quintix 6201',
      capacity: '6200g',
      readability: '0.01g',
      lastCal: '2026-03-10',
      status: 'ONLINE'
    },
    'FLOOR SCALES': {
      type: 'Mettler Toledo ICS',
      capacity: '3000 kg',
      readability: '0.1 kg',
      lastCal: '2026-03-08',
      status: 'ONLINE',
      currentLoad: '0 kg (empty)'
    },
    'WFI': {
      type: 'WFI Point of Use',
      temp: '80.2',
      flowRate: 'On demand',
      toc: '< 100 ppb',
      conductivity: '< 1.1 µS/cm',
      status: 'ONLINE'
    },
    'CONTROL TOWER': {
      type: 'Sartorius BIOSTAT STR Controller',
      status: 'ONLINE',
      cascadeLoops: 'pH, DO₂, Temperature, Level',
      alarms: '0 active',
      lastSync: '< 1 min ago'
    },
    'GAS PANEL': {
      type: 'Bronkhorst EL-FLOW Select',
      o2Flow: '0.8 SLPM',
      co2Flow: '0.12 SLPM',
      n2Flow: '0.3 SLPM',
      airFlow: '1.5 SLPM',
      status: 'RUNNING'
    },
    'CELL COUNTER': {
      type: 'Beckman Vi-CELL BLU',
      carousel: '18 / 24 positions loaded',
      lastRun: '14 min ago',
      lastResult: 'VCD: 42.8 x10⁶/mL, Viability: 95.3%',
      status: 'IDLE'
    },
    'CEDEX': {
      type: 'Roche Cedex HiRes',
      lastRun: '22 min ago',
      lastResult: 'VCD: 43.1 x10⁶/mL, Viability: 95.0%, Diameter: 15.2μm',
      status: 'IDLE'
    },
    'BSC': {
      type: 'Thermo Herasafe 2030i',
      class: 'Class II Type A2',
      width: '1.8m',
      airflow: '0.45 m/s downflow',
      filterStatus: 'HEPA: 98.2% life remaining',
      status: 'RUNNING'
    },
    'MICROSCOPE': {
      type: 'Olympus CKX53',
      objectives: '4x, 10x, 20x, 40x',
      contrast: 'Phase contrast',
      status: 'ONLINE'
    },
    'TUBE WELDER': {
      type: 'Sartorius BioWelder TC',
      weldsToday: 12,
      bladeLife: '188 / 200 welds',
      status: 'IDLE'
    },
    'STERILE FILTER': {
      type: 'Sartorius Sartopore 2 XLG',
      poreSize: '0.2 μm',
      area: '0.6 m²',
      throughput: '1,200L / 2,000L max',
      dP: '0.15 bar',
      status: 'IN-USE'
    },
    'SEED BR 20L': {
      stages: {
        'N-2': { day: 5, totalDays: 8, vcd: '8.4', viability: '98.2', titer: '0.08', ph: '7.05', dO2: '50', temp: '37.0', perfusionRate: 'N/A', cellDensity: '8.4e6', feedRate: '0.3', bleedRate: '0' },
        'N': { day: 0, totalDays: 0, vcd: '—', viability: '—', titer: '—', ph: '—', dO2: '—', temp: '—', perfusionRate: '—', cellDensity: '—', feedRate: '—', bleedRate: '—' }
      }
    },
    'INOCULATION': {
      type: 'Cell thaw & initial expansion',
      classification: 'ISO 7 / Grade C',
      status: 'ONLINE',
      currentCulture: 'CHO-K1 P+6'
    },
    'PASS-THROUGH': {
      type: 'Glass pass-through hatch',
      classification: 'ISO 7 ↔ ISO 7 boundary',
      status: 'CLOSED',
      lastUsed: '2026-03-14 08:45'
    }
  };

export var EQUIP_DOCS = {
    'BR': [
      { tag: 'pbr', title: 'PBR-2026-0312 · N Stage Perfusion', meta: 'Active batch record · Day 22 of 40', id: 'pbr-n-perf' },
      { tag: 'pbr', title: 'PBR-2026-0298 · N-1 Seed Expansion', meta: 'Active batch record · Day 8 of 14', id: 'pbr-n1-seed' },
      { tag: 'sop', title: 'SOP-BR-001 · Daily Sampling Procedure', meta: 'Bioreactor sampling — Cedex, Vi-Cell, BGA', id: 'sop-br-001' },
      { tag: 'sop', title: 'SOP-BR-002 · Bioreactor Setup & Inoculation', meta: 'Pre-use checks, media fill, cell seeding', id: 'sop-br-002' },
      { tag: 'sop', title: 'SOP-BR-003 · Perfusion Rate Adjustment', meta: 'VVD targeting, bleed control, feed ramp', id: 'sop-br-003' },
      { tag: 'sop', title: 'SOP-BR-004 · Cedex Bio HT Operation', meta: 'Metabolite panel — glucose, lactate, NH4+', id: 'sop-br-004' },
      { tag: 'sop', title: 'SOP-BR-005 · Vi-Cell XR Cell Count', meta: 'VCD, viability, cell diameter', id: 'sop-br-005' },
      { tag: 'sop', title: 'SOP-BR-006 · pH & DO₂ Probe Calibration', meta: 'Pre-campaign and weekly verification', id: 'sop-br-006' },
      { tag: 'sop', title: 'SOP-BR-007 · Harvest & Turnaround CIP', meta: 'End-of-campaign clean-in-place', id: 'sop-br-007' },
      { tag: 'spec', title: 'SPEC-BR-1000L · Equipment Qualification', meta: 'IQ/OQ/PQ · Sartorius BIOSTAT STR 1000', id: 'spec-br-1000' },
      { tag: 'log', title: 'LOG · Alarm History (Last 7 days)', meta: '3 events — 2 cleared, 1 acknowledged', id: 'log-br-alarm' },
      { tag: 'log', title: 'LOG · Parameter Trending', meta: 'pH, DO₂, temp, VCD overlay chart', id: 'log-br-trend' }
    ],
    'FEED TANK': [
      { tag: 'sop', title: 'SOP-FD-001 · Media Preparation', meta: 'CD CHO reconstitution & glucose supplement', id: 'sop-fd-001' },
      { tag: 'sop', title: 'SOP-FD-002 · Feed Tote Changeover', meta: 'Aseptic disconnect, new bag connection', id: 'sop-fd-002' },
      { tag: 'sop', title: 'SOP-FD-003 · Feed Rate Verification', meta: 'Pump calibration & gravimetric check', id: 'sop-fd-003' },
      { tag: 'spec', title: 'SPEC-FD-2000L · Single-Use Tote', meta: 'Sartorius Flexsafe 2000L bag specs', id: 'spec-fd-2000' },
      { tag: 'log', title: 'LOG · Feed Volume Tracking', meta: 'Consumption rate & refill history', id: 'log-fd-vol' }
    ],
    'BLEED TANK': [
      { tag: 'sop', title: 'SOP-BL-001 · Bleed Removal Procedure', meta: 'Pump-out, decontamination, waste path', id: 'sop-bl-001' },
      { tag: 'sop', title: 'SOP-BL-002 · Bleed Rate Adjustment', meta: 'Target CSPR, cell bleed calculations', id: 'sop-bl-002' },
      { tag: 'spec', title: 'SPEC-BL-2000L · Waste Tote', meta: 'Single-use containment specs', id: 'spec-bl-2000' },
      { tag: 'log', title: 'LOG · Bleed Volume History', meta: 'Daily bleed volumes & drain events', id: 'log-bl-vol' }
    ],
    'ATF': [
      { tag: 'sop', title: 'SOP-ATF-001 · ATF Setup & Priming', meta: 'Fiber wetting, flow path integrity test', id: 'sop-atf-001' },
      { tag: 'sop', title: 'SOP-ATF-002 · ATF Integrity Testing', meta: 'Pre-use and post-use pressure decay', id: 'sop-atf-002' },
      { tag: 'sop', title: 'SOP-ATF-003 · Exchange Rate Tuning', meta: 'Diaphragm timing & flow balance', id: 'sop-atf-003' },
      { tag: 'spec', title: 'SPEC-ATF6 · Repligen ATF6 System', meta: 'Hollow fiber, 0.2μm, 3000 fibers', id: 'spec-atf6' },
      { tag: 'log', title: 'LOG · Pressure Trending', meta: 'Feed / retentate / permeate traces', id: 'log-atf-pres' }
    ],
    'SU FILTER': [
      { tag: 'sop', title: 'SOP-SUF-001 · Depth Filter Installation', meta: 'Capsule mounting & integrity check', id: 'sop-suf-001' },
      { tag: 'sop', title: 'SOP-SUF-002 · Filter Changeout', meta: 'dP limit reached — swap procedure', id: 'sop-suf-002' },
      { tag: 'log', title: 'LOG · dP & Throughput', meta: 'Campaign lifetime tracking', id: 'log-suf-dp' }
    ],
    'HARVEST': [
      { tag: 'sop', title: 'SOP-HRV-001 · Harvest Sump Management', meta: 'Level monitoring & transfer to chromatography', id: 'sop-hrv-001' },
      { tag: 'sop', title: 'SOP-HRV-002 · Turbidity Sampling', meta: 'Inline monitoring & grab sample', id: 'sop-hrv-002' },
      { tag: 'log', title: 'LOG · Harvest Volume Log', meta: 'Daily collected permeate volumes', id: 'log-hrv-vol' }
    ],
    'PROTEIN A': [
      { tag: 'pbr', title: 'PBR · Capture Step (Protein A)', meta: 'Load, wash, elute cycle record', id: 'pbr-proa' },
      { tag: 'sop', title: 'SOP-CHR-001 · Column Packing & HETP', meta: 'MabSelect SuRe LX — packing & qualification', id: 'sop-chr-001' },
      { tag: 'sop', title: 'SOP-CHR-002 · Protein A Elution', meta: 'Low pH elution, neutralisation, pool', id: 'sop-chr-002' },
      { tag: 'sop', title: 'SOP-CHR-003 · CIP & Sanitisation', meta: '0.1M NaOH contact, resin lifetime', id: 'sop-chr-003' },
      { tag: 'spec', title: 'SPEC-AKTA · AKTA Ready System', meta: 'Cytiva AKTA ready — flow path specs', id: 'spec-akta' },
      { tag: 'log', title: 'LOG · Chromatogram Overlay', meta: 'UV280, conductivity, pH traces', id: 'log-chr-uv' }
    ],
    'ION EXCHANGE': [
      { tag: 'pbr', title: 'PBR · Polish Step (IEX)', meta: 'Capto Q flowthrough/bind-elute record', id: 'pbr-iex' },
      { tag: 'sop', title: 'SOP-IEX-001 · IEX Column Operation', meta: 'Equilibration, load, wash, strip', id: 'sop-iex-001' },
      { tag: 'sop', title: 'SOP-IEX-002 · Aggregate Clearance Check', meta: 'SEC-HPLC sampling protocol', id: 'sop-iex-002' },
      { tag: 'log', title: 'LOG · Resin Cycle Counter', meta: 'Lifetime tracking & reuse limit', id: 'log-iex-cyc' }
    ],
    'UF/DF': [
      { tag: 'sop', title: 'SOP-UFDF-001 · Membrane Conditioning', meta: 'Pre-use flush, NWP test, buffer prep', id: 'sop-ufdf-001' },
      { tag: 'sop', title: 'SOP-UFDF-002 · Concentration & Diafiltration', meta: 'Target 45 g/L, 8 diavolumes', id: 'sop-ufdf-002' },
      { tag: 'spec', title: 'SPEC-UFDF · Sartorius Sartoflow', meta: '30 kDa PES cassettes, 2.5 m²', id: 'spec-ufdf' },
      { tag: 'log', title: 'LOG · Flux & TMP Trending', meta: 'Permeate flux decay monitoring', id: 'log-ufdf-flux' }
    ],
    'FILL TANK': [
      { tag: 'pbr', title: 'PBR · Bulk Drug Substance Fill', meta: 'Final pool — ID, conc., bioburden', id: 'pbr-bds-fill' },
      { tag: 'sop', title: 'SOP-FILL-001 · Sterile Fill Procedure', meta: 'Aseptic transfer, in-line filter, sampling', id: 'sop-fill-001' },
      { tag: 'sop', title: 'SOP-FILL-002 · Final QC Sampling', meta: 'Endotoxin, bioburden, appearance, pH', id: 'sop-fill-002' },
      { tag: 'log', title: 'LOG · Fill Volume & Temperature', meta: 'Time-stamped fill progress', id: 'log-fill-vol' }
    ],
    'SEED BR': [
      { tag: 'pbr', title: 'PBR-2026-0298 · N-1 Seed Expansion', meta: 'Active batch record · Day 8 of 14', id: 'pbr-n1-seed' },
      { tag: 'sop', title: 'SOP-BR-001 · Daily Sampling Procedure', meta: 'Bioreactor sampling — Cedex, Vi-Cell, BGA', id: 'sop-br-001' },
      { tag: 'sop', title: 'SOP-BR-002 · Bioreactor Setup & Inoculation', meta: 'Pre-use checks, media fill, cell seeding', id: 'sop-br-002' },
      { tag: 'sop', title: 'SOP-BR-005 · Vi-Cell XR Cell Count', meta: 'VCD, viability, cell diameter', id: 'sop-br-005' },
      { tag: 'sop', title: 'SOP-BR-006 · pH & DO₂ Probe Calibration', meta: 'Pre-campaign and weekly verification', id: 'sop-br-006' }
    ],
    'MEDIA PREP': [
      { tag: 'sop', title: 'SOP-FD-001 · Media Preparation', meta: 'CD CHO reconstitution & glucose supplement', id: 'sop-fd-001' },
      { tag: 'sop', title: 'SOP-FD-003 · Feed Rate Verification', meta: 'Pump calibration & gravimetric check', id: 'sop-fd-003' },
      { tag: 'spec', title: 'SPEC-FD-2000L · Single-Use Tote', meta: 'Sartorius Flexsafe 2000L bag specs', id: 'spec-fd-2000' },
      { tag: 'log', title: 'LOG · Feed Volume Tracking', meta: 'Consumption rate & refill history', id: 'log-fd-vol' }
    ],
    'MEDIA HOLD': [
      { tag: 'sop', title: 'SOP-FD-001 · Media Preparation', meta: 'CD CHO reconstitution & glucose supplement', id: 'sop-fd-001' },
      { tag: 'sop', title: 'SOP-FD-002 · Feed Tote Changeover', meta: 'Aseptic disconnect, new bag connection', id: 'sop-fd-002' },
      { tag: 'log', title: 'LOG · Feed Volume Tracking', meta: 'Consumption rate & refill history', id: 'log-fd-vol' }
    ],
    'PARTS WASHER': [
      { tag: 'sop', title: 'SOP-PW-001 · Parts Washer Operation', meta: 'Load, cycle selection, unload procedure', id: 'sop-pw-001' },
      { tag: 'sop', title: 'SOP-PW-002 · Wash Validation', meta: 'Rinse water TOC and conductivity checks', id: 'sop-pw-002' },
      { tag: 'log', title: 'LOG · Wash Cycle History', meta: 'Cycle count, load records, failures', id: 'log-pw-cyc' }
    ],
    'AUTOCLAVE': [
      { tag: 'sop', title: 'SOP-AC-001 · Autoclave Operation', meta: 'Loading, cycle selection, BI placement', id: 'sop-ac-001' },
      { tag: 'sop', title: 'SOP-AC-002 · Biological Indicator Reading', meta: 'BI incubation and pass/fail determination', id: 'sop-ac-002' },
      { tag: 'spec', title: 'SPEC-AC · Getinge GSS 6713', meta: 'Steam steriliser qualification docs', id: 'spec-ac-getinge' },
      { tag: 'log', title: 'LOG · Sterilisation Cycle Log', meta: 'Cycle records, BI results, load manifest', id: 'log-ac-cyc' }
    ],
    'PARTS RACK': [
      { tag: 'sop', title: 'SOP-PW-003 · Parts Handling & Storage', meta: 'Clean/sterile hold times, labelling requirements', id: 'sop-pw-003' },
      { tag: 'log', title: 'LOG · Parts Inventory', meta: 'Current rack contents and hold times', id: 'log-rack-inv' }
    ],
    'CONTROL TOWER': [
      { tag: 'sop', title: 'SOP-CT-001 · Controller Operation', meta: 'Startup, alarm management, setpoint changes', id: 'sop-ct-001' },
      { tag: 'spec', title: 'SPEC-CT · Sartorius BIOSTAT STR Controller', meta: 'Hardware & software qualification', id: 'spec-ct' }
    ],
    'GAS PANEL': [
      { tag: 'sop', title: 'SOP-GAS-001 · Gas Supply Setup', meta: 'MFC calibration, line purge, leak check', id: 'sop-gas-001' },
      { tag: 'spec', title: 'SPEC-GAS · Bronkhorst EL-FLOW Select', meta: 'Mass flow controller specifications', id: 'spec-gas' }
    ],
    'CELL COUNTER': [
      { tag: 'sop', title: 'SOP-VC-001 · Vi-CELL BLU Operation', meta: 'Sample loading, carousel management, maintenance', id: 'sop-vc-001' },
      { tag: 'spec', title: 'SPEC-VC · Beckman Vi-CELL BLU', meta: 'Automated cell viability analyser specs', id: 'spec-vc' }
    ],
    'CEDEX': [
      { tag: 'sop', title: 'SOP-CX-001 · Cedex HiRes Operation', meta: 'Sample prep, measurement, QC checks', id: 'sop-cx-001' },
      { tag: 'spec', title: 'SPEC-CX · Roche Cedex HiRes', meta: 'Automated cell analyser qualification', id: 'spec-cx' }
    ],
    'BSC': [
      { tag: 'sop', title: 'SOP-BSC-001 · BSC Operation', meta: 'Decontamination, UV cycle, airflow verification', id: 'sop-bsc-001' },
      { tag: 'spec', title: 'SPEC-BSC · Thermo Herasafe 2030i', meta: 'Class II Type A2 biosafety cabinet specs', id: 'spec-bsc' }
    ],
    'TUBE WELDER': [
      { tag: 'sop', title: 'SOP-TW-001 · Tube Welding Procedure', meta: 'Aseptic weld, visual inspection, pull test', id: 'sop-tw-001' }
    ],
    'STERILE FILTER': [
      { tag: 'sop', title: 'SOP-SF-001 · Capsule Filter Operation', meta: 'Installation, integrity test, sterile filtration', id: 'sop-sf-001' }
    ],
    'SEED BR 20L': [
      { tag: 'sop', title: 'SOP-BR-002 · Bioreactor Setup & Inoculation', meta: 'Pre-use checks, media fill, cell seeding', id: 'sop-br-002' },
      { tag: 'sop', title: 'SOP-BR-001 · Daily Sampling Procedure', meta: 'Bioreactor sampling — Cedex, Vi-Cell, BGA', id: 'sop-br-001' }
    ]
  };

export var DOC_CONTENT = {
    'pbr-n-perf': {
      title: 'PBR-2026-0312 · N Stage Perfusion',
      tag: 'pbr',
      sections: [
        { heading: 'Batch Information', text: '<div class="param">Batch ID: WXB-2026-0312</div><div class="param">Product: mAb-X (IgG1)</div><div class="param">Scale: 1000L perfusion</div><div class="param">Start date: 2026-02-18</div><div class="param">Target duration: 40 days</div><div class="param">Current day: 22</div>' },
        { heading: 'Inoculation Parameters', text: '<div class="param">Seed density: 0.5 x10\u2076/mL</div><div class="param">Inoculum volume: 50L from N-1</div><div class="param">Media: CD CHO + 8g/L glucose</div><div class="param">Initial volume: 800L (ramp to 1000L by Day 3)</div>' },
        { heading: 'Perfusion Targets', text: '<ol><li>Maintain VCD between <span class="param">30\u201360 x10\u2076/mL</span></li><li>Target perfusion rate: <span class="param">1.5\u20132.5 VVD</span></li><li>Cell-specific perfusion rate: <span class="param">30\u201350 pL/cell/day</span></li><li>Bleed to maintain VCD below <span class="param">60 x10\u2076/mL</span></li><li>Harvest daily via ATF permeate line</li></ol>' },
        { heading: 'Daily Sampling Schedule', text: '<ul><li><span class="param">06:00</span> \u2014 Cedex Bio HT (metabolites: glucose, lactate, NH4+, glutamine)</li><li><span class="param">06:00</span> \u2014 Vi-Cell XR (VCD, viability, avg diameter)</li><li><span class="param">06:00</span> \u2014 BGA (pH, pCO2, pO2)</li><li><span class="param">14:00</span> \u2014 Titer sample (Protein A HPLC)</li><li><span class="param">14:00</span> \u2014 Osmolality</li></ul>' },
        { heading: 'Critical Process Parameters', text: '<div class="param">pH: 6.90 \u2013 7.10 (setpoint 7.00)</div><div class="param">DO\u2082: 40 \u2013 50% (setpoint 45%)</div><div class="param">Temperature: 36.0 \u2013 37.0\u00b0C (setpoint 36.5\u00b0C)</div><div class="param">Agitation: 100 \u2013 150 rpm</div><div class="warn">Deviation trigger: any CPP out of range for > 30 min</div>' },
        { heading: 'Signatures', text: '<div class="param">Initiated by: S. Murphy (MFG)</div><div class="param">Reviewed by: D. Chen (QA)</div><div class="param">Approved by: pending</div>' }
      ]
    },
    'pbr-n1-seed': {
      title: 'PBR-2026-0298 · N-1 Seed Expansion',
      tag: 'pbr',
      sections: [
        { heading: 'Batch Information', text: '<div class="param">Batch ID: WXB-2026-0298</div><div class="param">Product: mAb-X (IgG1)</div><div class="param">Scale: 200L seed expansion</div><div class="param">Start date: 2026-03-05</div><div class="param">Target duration: 14 days</div><div class="param">Current day: 8</div>' },
        { heading: 'Seed Train', text: '<div class="param">Source: N-2 shake flask (2L)</div><div class="param">Passage: P+8</div><div class="param">Seed density: 0.3 x10\u2076/mL</div><div class="param">Target harvest VCD: 20\u201325 x10\u2076/mL</div><div class="param">Target viability at transfer: > 95%</div>' },
        { heading: 'Culture Conditions', text: '<div class="param">pH: 7.00 \u00b1 0.05</div><div class="param">DO\u2082: 50% \u00b1 5%</div><div class="param">Temperature: 37.0\u00b0C</div><div class="param">Media: CD CHO + 6g/L glucose</div>' }
      ]
    },
    'sop-br-001': {
      title: 'SOP-BR-001 · Daily Sampling Procedure',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'This SOP defines the daily sampling procedure for all production bioreactors in the perfusion facility. It covers sample collection, instrument operation, and data entry requirements.' },
        { heading: 'Scope', text: 'Applicable to all 1000L perfusion bioreactors (BR-1, BR-2, BR-3) during active N-1 seed and N production campaigns.' },
        { heading: 'Equipment Required', text: '<ul><li>Cedex Bio HT analyser</li><li>Vi-Cell XR cell counter</li><li>Blood gas analyser (BGA)</li><li>Sterile 50mL syringes</li><li>Sample port adapters (aseptic connectors)</li><li>PPE: gloves, lab coat, safety glasses</li></ul>' },
        { heading: 'Procedure', text: '<ol><li>Don PPE and verify bioreactor is in operational state</li><li>Perform sample port spray-down with 70% IPA</li><li>Attach sterile syringe to sample port via aseptic connector</li><li>Discard first <span class="param">10mL</span> (dead volume purge)</li><li>Collect <span class="param">30mL</span> sample into labelled tubes</li><li>Immediately cap and transport to analytics lab</li><li>Run Vi-Cell XR: load <span class="param">1mL</span> sample, record VCD and viability</li><li>Run Cedex Bio HT: load <span class="param">0.5mL</span>, run metabolite panel</li><li>Run BGA: <span class="param">0.2mL</span> for pH, pCO\u2082, pO\u2082</li><li>Enter all results into batch record within <span class="param">30 minutes</span></li></ol>' },
        { heading: 'Acceptance Criteria', text: '<div class="param">VCD: recorded (no pass/fail)</div><div class="param">Viability: > 80% (alert if < 90%)</div><div class="param">Glucose: > 2.0 g/L (alert if < 3.0 g/L)</div><div class="param">Lactate: < 3.0 g/L (alert if > 2.0 g/L)</div><div class="warn">If viability drops below 80%, immediately notify shift lead and QA.</div>' },
        { heading: 'References', text: 'SOP-BR-004 (Cedex Bio HT Operation) · SOP-BR-005 (Vi-Cell XR Cell Count) · PBR template for data entry' }
      ]
    },
    'sop-br-002': {
      title: 'SOP-BR-002 · Bioreactor Setup & Inoculation',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Defines the procedure for bioreactor preparation, integrity testing, media fill, and inoculation from N-1 seed.' },
        { heading: 'Pre-Use Checks', text: '<ol><li>Verify CIP/SIP cycle completed and logged</li><li>Confirm all probes calibrated (pH, DO\u2082, temperature)</li><li>Check agitator rotation and seal integrity</li><li>Verify all tubing connections and aseptic welds</li><li>Run pressure hold test: <span class="param">5 PSI for 30 min, < 1 PSI drop</span></li></ol>' },
        { heading: 'Media Fill', text: '<ol><li>Connect media tote via sterile connector</li><li>Transfer <span class="param">800L</span> CD CHO media at <span class="param">4\u00b0C</span></li><li>Warm to <span class="param">37\u00b0C</span> using jacket heating</li><li>Confirm pH and DO\u2082 stabilisation at setpoints</li></ol>' },
        { heading: 'Inoculation', text: '<ol><li>Verify N-1 seed meets release criteria (VCD > 15 x10\u2076/mL, viability > 95%)</li><li>Aseptically transfer <span class="param">50L</span> seed via welded line</li><li>Target post-inoculation density: <span class="param">0.5 x10\u2076/mL</span></li><li>Start agitation at <span class="param">100 rpm</span></li><li>Begin DO\u2082 cascade control</li></ol>' }
      ]
    },
    'sop-br-003': {
      title: 'SOP-BR-003 · Perfusion Rate Adjustment',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Guides operators on adjusting the perfusion rate (VVD) and bleed rate based on daily cell density and metabolite readings.' },
        { heading: 'Perfusion Rate Targets', text: '<div class="param">CSPR target: 30\u201350 pL/cell/day</div><div class="param">VVD = CSPR x VCD / 1000</div><div class="param">Min VVD: 1.0 · Max VVD: 3.0</div><div class="warn">Do not exceed 3.0 VVD without supervisor approval.</div>' },
        { heading: 'Bleed Control', text: '<ol><li>If VCD > <span class="param">50 x10\u2076/mL</span>: initiate or increase bleed</li><li>Target bleed to maintain VCD at <span class="param">40\u201350 x10\u2076/mL</span></li><li>Calculate bleed rate: (VCD\u2080 \u2212 VCD_target) / VCD\u2080 \u00d7 perfusion rate</li><li>Adjust pump setpoint on DeltaV and verify flow</li></ol>' },
        { heading: 'Feed Ramp Schedule', text: '<div class="param">Day 0\u20133: 0.5 VVD (batch mode, no perfusion)</div><div class="param">Day 3\u20135: ramp 0.5 \u2192 1.5 VVD</div><div class="param">Day 5+: maintain at CSPR-calculated rate</div>' }
      ]
    },
    'sop-br-004': {
      title: 'SOP-BR-004 · Cedex Bio HT Operation',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Operating procedure for the Roche Cedex Bio HT analyser for daily metabolite analysis.' },
        { heading: 'Analytes', text: '<div class="param">Glucose (enzymatic)</div><div class="param">Lactate (enzymatic)</div><div class="param">Glutamine / Glutamate</div><div class="param">NH4+ (ammonium)</div><div class="param">Na+, K+ (ion-selective)</div><div class="param">Osmolality</div>' },
        { heading: 'Procedure', text: '<ol><li>Power on and wait for self-test (<span class="param">~5 min</span>)</li><li>Run daily QC cartridge \u2014 must pass before patient samples</li><li>Load <span class="param">0.5mL</span> sample into micro-cup</li><li>Select full metabolite panel on touchscreen</li><li>Run time: <span class="param">~12 min</span></li><li>Review results, flag any out-of-range values</li><li>Export results to LIMS</li></ol>' }
      ]
    },
    'sop-br-005': {
      title: 'SOP-BR-005 · Vi-Cell XR Cell Count',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Operating procedure for the Beckman Coulter Vi-Cell XR automated cell viability analyser.' },
        { heading: 'Parameters Measured', text: '<div class="param">Viable cell density (VCD)</div><div class="param">Total cell density</div><div class="param">Viability %</div><div class="param">Average cell diameter</div>' },
        { heading: 'Procedure', text: '<ol><li>Gently mix sample by inversion (do not vortex)</li><li>Load <span class="param">1.0mL</span> into Vi-Cell sample cup</li><li>Select cell type profile: <span class="param">CHO-Perfusion</span></li><li>Run analysis (<span class="param">~2.5 min</span>)</li><li>Verify image quality \u2014 re-run if bubble artifacts detected</li><li>Record VCD, viability, diameter in batch record</li></ol>' },
        { heading: 'Troubleshooting', text: '<ul><li><span class="warn">Low viability reading?</span> Check sample age \u2014 must be run within 15 min</li><li><span class="warn">High debris count?</span> Dilute 1:2 with PBS and re-run</li></ul>' }
      ]
    },
    'sop-br-006': {
      title: 'SOP-BR-006 · pH & DO\u2082 Probe Calibration',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Calibration procedure for inline pH and dissolved oxygen probes. Performed pre-campaign and weekly during operation.' },
        { heading: 'pH Calibration', text: '<ol><li>Remove probe from bioreactor port</li><li>Two-point calibration: <span class="param">pH 4.01</span> and <span class="param">pH 7.00</span> buffers</li><li>Slope acceptance: <span class="param">95\u2013105%</span></li><li>Offset acceptance: <span class="param">\u00b1 0.05 pH</span></li><li>Record slope and offset in calibration log</li></ol>' },
        { heading: 'DO\u2082 Calibration', text: '<ol><li>Two-point: <span class="param">0% (nitrogen sparge)</span> and <span class="param">100% (air saturation)</span></li><li>Response time check: T90 < <span class="param">60 seconds</span></li></ol>' }
      ]
    },
    'sop-br-007': {
      title: 'SOP-BR-007 · Harvest & Turnaround CIP',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'End-of-campaign clean-in-place procedure for bioreactor vessel and associated piping.' },
        { heading: 'CIP Sequence', text: '<ol><li>Drain vessel contents to waste</li><li>Pre-rinse: <span class="param">WFI, 50\u00b0C, 15 min</span></li><li>Caustic wash: <span class="param">0.5M NaOH, 70\u00b0C, 30 min</span></li><li>Acid rinse: <span class="param">0.1M H\u2083PO\u2084, 25\u00b0C, 15 min</span></li><li>Final rinse: <span class="param">WFI, 25\u00b0C, 15 min</span></li><li>TOC sample from final rinse \u2014 must be < <span class="param">500 ppb</span></li><li>Conductivity check: < <span class="param">1.3 \u00b5S/cm</span></li></ol>' }
      ]
    },
    'spec-br-1000': {
      title: 'SPEC-BR-1000L · Equipment Qualification',
      tag: 'spec',
      sections: [
        { heading: 'Equipment', text: '<div class="param">Manufacturer: Sartorius</div><div class="param">Model: BIOSTAT STR 1000</div><div class="param">Working volume: 200\u20131000L</div><div class="param">Vessel material: 316L stainless steel</div>' },
        { heading: 'Qualification Status', text: '<div class="param">IQ: Completed 2025-06-15 \u2714</div><div class="param">OQ: Completed 2025-07-20 \u2714</div><div class="param">PQ: Completed 2025-09-01 \u2714</div><div class="param">Next requalification: 2026-09-01</div>' },
        { heading: 'Key Specifications', text: '<div class="param">Temperature range: 15\u201345\u00b0C (\u00b1 0.1\u00b0C)</div><div class="param">pH control: 2.0\u201312.0 (\u00b1 0.02)</div><div class="param">DO\u2082 control: 0\u2013100% (\u00b1 1%)</div><div class="param">Agitation: 20\u2013300 rpm</div><div class="param">Max pressure: 1.0 bar</div>' }
      ]
    },
    'log-br-alarm': {
      title: 'LOG · Alarm History (Last 7 days)',
      tag: 'log',
      sections: [
        { heading: 'Active Alarms', text: '<div class="warn">None</div>' },
        { heading: 'Recent Events', text: '<div class="param">2026-03-11 14:22 \u2014 DO\u2082 low alarm (38%) \u2014 CLEARED (auto-recovered)</div><div class="param">2026-03-10 03:15 \u2014 Foam probe triggered \u2014 CLEARED (antifoam dosed)</div><div class="param">2026-03-08 09:41 \u2014 Feed pump flow deviation > 10% \u2014 ACKNOWLEDGED (recalibrated)</div>' }
      ]
    },
    'log-br-trend': {
      title: 'LOG · Parameter Trending',
      tag: 'log',
      sections: [
        { heading: 'Trend Summary (7-day)', text: '<div class="param">pH: stable at 6.98 \u00b1 0.03</div><div class="param">DO\u2082: 42 \u00b1 3% (one low excursion)</div><div class="param">Temp: 36.5 \u00b1 0.1\u00b0C</div><div class="param">VCD: 38.2 \u2192 42.8 x10\u2076/mL (growth phase)</div><div class="param">Viability: 96.1 \u2192 95.3% (stable)</div><div class="param">Titer: 1.52 \u2192 1.85 g/L (increasing)</div>' }
      ]
    },
    'sop-fd-001': {
      title: 'SOP-FD-001 · Media Preparation',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Preparation and quality checks for CD CHO media with glucose supplement for perfusion feed.' },
        { heading: 'Procedure', text: '<ol><li>Reconstitute CD CHO powder in <span class="param">WFI at 37\u00b0C</span></li><li>Add glucose supplement to <span class="param">8 g/L</span></li><li>Adjust pH to <span class="param">7.0 \u00b1 0.1</span> with NaOH/HCl</li><li>Sterile filter through <span class="param">0.2\u00b5m PES</span></li><li>Store at <span class="param">2\u20138\u00b0C</span>, use within <span class="param">14 days</span></li></ol>' }
      ]
    },
    'sop-fd-002': {
      title: 'SOP-FD-002 · Feed Tote Changeover',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Aseptic disconnection and connection procedure for single-use feed totes during perfusion.' },
        { heading: 'Procedure', text: '<ol><li>Pause feed pump</li><li>Clamp tubing upstream and downstream of connector</li><li>Weld-seal the line using tube sealer</li><li>Cut between seals</li><li>Aseptically connect new tote via ReadyMate connector</li><li>Verify line integrity, release clamps, resume pump</li><li>Log tote ID, lot, and changeover time in PBR</li></ol>' }
      ]
    },
    'sop-fd-003': {
      title: 'SOP-FD-003 · Feed Rate Verification',
      tag: 'sop',
      sections: [
        { heading: 'Purpose', text: 'Gravimetric verification of feed pump calibration and delivery rate accuracy.' },
        { heading: 'Procedure', text: '<ol><li>Place feed tote on calibrated scale</li><li>Record initial weight</li><li>Run pump at setpoint for <span class="param">10 min</span></li><li>Record final weight</li><li>Calculate: actual rate = \u0394weight / time</li><li>Acceptance: within <span class="param">\u00b1 5%</span> of setpoint</li><li>If out of spec: recalibrate pump and repeat</li></ol>' }
      ]
    },
    'spec-fd-2000': { title: 'SPEC-FD-2000L · Single-Use Tote', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Sartorius</div><div class="param">Model: Flexsafe 2000L</div><div class="param">Material: multi-layer PE film</div><div class="param">Gamma irradiated: Yes (25\u201340 kGy)</div><div class="param">Extractables: meets USP <665></div>' }] },
    'log-fd-vol': { title: 'LOG · Feed Volume Tracking', tag: 'log', sections: [{ heading: 'Recent', text: '<div class="param">Current tote: 580L remaining (of 2000L)</div><div class="param">Consumption: ~180L/day at 7.2 L/hr</div><div class="param">Est. changeover: 2026-03-16</div>' }] },
    'sop-bl-001': { title: 'SOP-BL-001 · Bleed Removal Procedure', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Safe removal and disposal of cell-laden bleed waste from perfusion bioreactors.' }, { heading: 'Procedure', text: '<ol><li>Verify waste tote fill level on scale</li><li>If > <span class="param">80% full</span>: initiate drain to waste system</li><li>Open drain valve, pump out at <span class="param">5 L/min</span></li><li>Chemical decontamination of waste stream</li><li>Log drain volume, time, and tote ID</li></ol>' }] },
    'sop-bl-002': { title: 'SOP-BL-002 · Bleed Rate Adjustment', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Review morning VCD result</li><li>If VCD > target: increase bleed rate per SOP-BR-003 formula</li><li>Adjust pump setpoint on DeltaV</li><li>Verify actual flow with inline flowmeter</li><li>Record new setpoint in PBR</li></ol>' }] },
    'spec-bl-2000': { title: 'SPEC-BL-2000L · Waste Tote', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Single-use waste containment</div><div class="param">Capacity: 2000L</div><div class="param">Material: PE film, non-sterile</div><div class="param">Disposal: autoclaved or chemically decontaminated</div>' }] },
    'log-bl-vol': { title: 'LOG · Bleed Volume History', tag: 'log', sections: [{ heading: 'Recent', text: '<div class="param">Today: 67L collected (2.8 L/hr)</div><div class="param">Yesterday: 62L</div><div class="param">Tote level: 59% full (1180L of 2000L)</div>' }] },
    'sop-atf-001': { title: 'SOP-ATF-001 · ATF Setup & Priming', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Install hollow fiber cartridge into ATF housing</li><li>Connect feed, retentate, and permeate lines</li><li>Prime with <span class="param">PBS, 500mL/min for 10 min</span></li><li>Perform bubble-point integrity test</li><li>Connect to bioreactor loop</li></ol>' }] },
    'sop-atf-002': { title: 'SOP-ATF-002 · ATF Integrity Testing', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Isolate filter from process</li><li>Pressurise permeate side to <span class="param">0.5 bar</span></li><li>Monitor pressure decay over <span class="param">10 min</span></li><li>Pass criteria: < <span class="param">0.02 bar</span> drop</li><li>If fail: replace cartridge and retest</li></ol>' }] },
    'sop-atf-003': { title: 'SOP-ATF-003 · Exchange Rate Tuning', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Set initial exchange rate to <span class="param">0.8/min</span></li><li>Monitor TMP and permeate flux</li><li>Increase by <span class="param">0.1/min</span> increments if flux drops</li><li>Do not exceed <span class="param">1.5/min</span> to avoid cell damage</li></ol>' }] },
    'spec-atf6': { title: 'SPEC-ATF6 · Repligen ATF6 System', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Model: Repligen ATF6</div><div class="param">Fiber count: 3000</div><div class="param">Pore size: 0.2 \u00b5m (PES)</div><div class="param">Surface area: 4.7 m\u00b2</div><div class="param">Max flow: 6 L/min</div>' }] },
    'log-atf-pres': { title: 'LOG · Pressure Trending', tag: 'log', sections: [{ heading: 'Current', text: '<div class="param">Feed: 0.8 bar (stable)</div><div class="param">Retentate: 0.3 bar (stable)</div><div class="param">Permeate: 0.1 bar (stable)</div><div class="param">TMP: 0.45 bar (within range)</div>' }] },
    'sop-suf-001': { title: 'SOP-SUF-001 · Depth Filter Installation', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Inspect capsule for damage</li><li>Install in filter housing, torque to <span class="param">25 Nm</span></li><li>Flush with <span class="param">WFI, 10 L</span></li><li>Integrity test: bubble point > <span class="param">1.2 bar</span></li></ol>' }] },
    'sop-suf-002': { title: 'SOP-SUF-002 · Filter Changeout', tag: 'sop', sections: [{ heading: 'Trigger', text: '<div class="warn">dP > 1.5 bar OR throughput > 1500L</div>' }, { heading: 'Procedure', text: '<ol><li>Stop permeate flow</li><li>Depressurise housing</li><li>Remove spent capsule, dispose as biohazard</li><li>Install new capsule per SOP-SUF-001</li><li>Resume flow and verify dP < 0.2 bar</li></ol>' }] },
    'log-suf-dp': { title: 'LOG · dP & Throughput', tag: 'log', sections: [{ heading: 'Current', text: '<div class="param">dP: 0.4 bar (of 1.5 max)</div><div class="param">Throughput: 840L (of 1500L max)</div><div class="param">Campaign day: 22 of 40</div><div class="param">Estimated changeout: Day 32</div>' }] },
    'sop-hrv-001': { title: 'SOP-HRV-001 · Harvest Sump Management', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Monitor level via load cell (target: 40\u201370%)</li><li>When level > 60%: initiate transfer to Protein A column</li><li>Transfer rate: <span class="param">5 L/min</span></li><li>Hold time in sump: < <span class="param">4 hours</span></li></ol>' }] },
    'sop-hrv-002': { title: 'SOP-HRV-002 · Turbidity Sampling', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Collect grab sample from sump sample port</li><li>Measure turbidity on benchtop meter</li><li>Acceptance: < <span class="param">25 NTU</span></li><li>If > 25 NTU: check upstream ATF integrity</li></ol>' }] },
    'log-hrv-vol': { title: 'LOG · Harvest Volume Log', tag: 'log', sections: [{ heading: 'Recent', text: '<div class="param">Today: 180L collected</div><div class="param">Yesterday: 175L</div><div class="param">7-day avg: 172 L/day</div>' }] },
    'pbr-proa': { title: 'PBR · Capture Step (Protein A)', tag: 'pbr', sections: [{ heading: 'Cycle Record', text: '<div class="param">Cycle #142 of 200</div><div class="param">Load volume: 64L harvest</div><div class="param">Phase: ELUTION</div><div class="param">Yield: 92.3%</div><div class="param">HCP: < 50 ppm</div>' }] },
    'sop-chr-001': { title: 'SOP-CHR-001 · Column Packing & HETP', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Pack column with MabSelect SuRe LX resin</li><li>Compression factor: <span class="param">1.15</span></li><li>Run HETP test with <span class="param">1% acetone</span></li><li>Acceptance: HETP < <span class="param">0.05 cm</span>, asymmetry 0.8\u20131.5</li></ol>' }] },
    'sop-chr-002': { title: 'SOP-CHR-002 · Protein A Elution', tag: 'sop', sections: [{ heading: 'Method', text: '<ol><li>Equilibrate with <span class="param">50mM phosphate, pH 7.4</span></li><li>Load harvest at <span class="param">30 g/L resin capacity</span></li><li>Wash: <span class="param">10 CV phosphate buffer</span></li><li>Elute: <span class="param">100mM glycine, pH 3.5</span></li><li>Neutralise eluate to <span class="param">pH 5.5</span> within 30 min</li></ol>' }] },
    'sop-chr-003': { title: 'SOP-CHR-003 · CIP & Sanitisation', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Strip: <span class="param">6M guanidine, 3 CV</span></li><li>CIP: <span class="param">0.1M NaOH, 5 CV, 60 min contact</span></li><li>Re-equilibrate</li><li>Storage: <span class="param">20% ethanol</span> if > 48h idle</li></ol>' }] },
    'spec-akta': { title: 'SPEC-AKTA · AKTA Ready System', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Cytiva</div><div class="param">Model: AKTA ready</div><div class="param">Flow range: 10\u2013600 mL/min</div><div class="param">Pressure limit: 0.5 MPa</div><div class="param">UV, conductivity, pH monitors inline</div>' }] },
    'log-chr-uv': { title: 'LOG · Chromatogram Overlay', tag: 'log', sections: [{ heading: 'Latest Cycle', text: '<div class="param">UV280 peak area: 1842 mAU\u00b7mL</div><div class="param">Step yield: 92.3%</div><div class="param">Elution pool: 5.2L</div><div class="param">Conductivity at elution: 12.4 mS/cm</div>' }] },
    'pbr-iex': { title: 'PBR · Polish Step (IEX)', tag: 'pbr', sections: [{ heading: 'Cycle Record', text: '<div class="param">Cycle #88 of 150</div><div class="param">Mode: flowthrough</div><div class="param">Load: 5.0L Protein A eluate</div><div class="param">Purity: 99.1%</div><div class="param">Aggregates: 0.3%</div>' }] },
    'sop-iex-001': { title: 'SOP-IEX-001 · IEX Column Operation', tag: 'sop', sections: [{ heading: 'Method', text: '<ol><li>Equilibrate with <span class="param">50mM Tris, pH 8.0</span></li><li>Load Protein A pool (adjusted to pH 8.0)</li><li>Collect flowthrough (product)</li><li>Strip: <span class="param">1M NaCl, 3 CV</span></li><li>CIP: <span class="param">1M NaOH, 3 CV</span></li></ol>' }] },
    'sop-iex-002': { title: 'SOP-IEX-002 · Aggregate Clearance Check', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Collect <span class="param">0.5mL</span> from IEX flowthrough</li><li>Run SEC-HPLC within <span class="param">24 hours</span></li><li>Acceptance: aggregates < <span class="param">1.0%</span>, monomer > <span class="param">98%</span></li></ol>' }] },
    'log-iex-cyc': { title: 'LOG · Resin Cycle Counter', tag: 'log', sections: [{ heading: 'Status', text: '<div class="param">Cycles used: 88 of 150 max</div><div class="param">Remaining: 62 cycles</div><div class="param">Resin lot: CQ-2025-1142</div><div class="param">Install date: 2025-11-01</div>' }] },
    'sop-ufdf-001': { title: 'SOP-UFDF-001 · Membrane Conditioning', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Flush cassettes with <span class="param">WFI, 10 L/m\u00b2</span></li><li>NWP test: > <span class="param">2.0 LMH/psi</span></li><li>Equilibrate with formulation buffer</li></ol>' }] },
    'sop-ufdf-002': { title: 'SOP-UFDF-002 · Concentration & Diafiltration', tag: 'sop', sections: [{ heading: 'Method', text: '<ol><li>Concentrate IEX pool from <span class="param">~5 g/L</span> to <span class="param">45 g/L</span></li><li>TMP target: <span class="param">1.0\u20131.5 bar</span></li><li>Switch to diafiltration: <span class="param">8 diavolumes</span> of formulation buffer</li><li>Final concentration adjustment to <span class="param">45 \u00b1 2 g/L</span></li></ol>' }] },
    'spec-ufdf': { title: 'SPEC-UFDF · Sartorius Sartoflow', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">MWCO: 30 kDa (PES)</div><div class="param">Area: 2.5 m\u00b2</div><div class="param">Cassette count: 5</div><div class="param">Max TMP: 3.0 bar</div>' }] },
    'log-ufdf-flux': { title: 'LOG · Flux & TMP Trending', tag: 'log', sections: [{ heading: 'Current Run', text: '<div class="param">Flux: 28 LMH (stable)</div><div class="param">TMP: 1.2 bar</div><div class="param">Diavolumes completed: 6 of 8</div>' }] },
    'pbr-bds-fill': { title: 'PBR · Bulk Drug Substance Fill', tag: 'pbr', sections: [{ heading: 'Record', text: '<div class="param">Product: mAb-X BDS</div><div class="param">Concentration: 45 g/L</div><div class="param">Fill volume: 85L (of 200L target)</div><div class="param">Temperature: 5.0\u00b0C</div><div class="param">Status: FILLING</div><div class="param">Batch: WXB-2026-0312</div>' }] },
    'sop-fill-001': { title: 'SOP-FILL-001 · Sterile Fill Procedure', tag: 'sop', sections: [{ heading: 'Procedure', text: '<ol><li>Verify fill tank integrity (pressure hold)</li><li>Connect UF/DF output via <span class="param">0.2\u00b5m sterile filter</span></li><li>Fill at <span class="param">2 L/min</span></li><li>Monitor temperature: maintain <span class="param">2\u20138\u00b0C</span></li><li>Take in-process samples at 25%, 50%, 75% fill</li></ol>' }] },
    'sop-fill-002': { title: 'SOP-FILL-002 · Final QC Sampling', tag: 'sop', sections: [{ heading: 'Samples Required', text: '<ul><li><span class="param">Endotoxin</span> (LAL) \u2014 < 0.5 EU/mg</li><li><span class="param">Bioburden</span> \u2014 < 1 CFU/mL</li><li><span class="param">Appearance</span> \u2014 clear, colourless to pale yellow</li><li><span class="param">pH</span> \u2014 5.5 \u00b1 0.3</li><li><span class="param">Concentration</span> (A280) \u2014 45 \u00b1 2 g/L</li><li><span class="param">SEC-HPLC</span> \u2014 monomer > 98%</li></ul>' }] },
    'log-fill-vol': { title: 'LOG · Fill Volume & Temperature', tag: 'log', sections: [{ heading: 'Current', text: '<div class="param">Volume: 85L of 200L (43%)</div><div class="param">Temperature: 5.0\u00b0C (in range)</div><div class="param">Fill rate: 2.0 L/min</div><div class="param">Est. completion: 58 min</div>' }] },
    'sop-pw-001': { title: 'SOP-PW-001 · Parts Washer Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for the automated parts washer used to clean bioreactor components, sampling equipment, and process parts.' }, { heading: 'Procedure', text: '<ol><li>Sort parts by material type (stainless steel, glass, silicone)</li><li>Load into appropriate racks \u2014 do not overload</li><li>Select wash cycle: <span class="param">Standard Glassware</span> or <span class="param">Heavy Duty</span></li><li>Verify detergent and rinse aid levels</li><li>Start cycle \u2014 do not open door during operation</li><li>Confirm cycle completion on printout</li><li>Unload into clean parts area within <span class="param">30 minutes</span></li></ol>' }] },
    'sop-pw-002': { title: 'SOP-PW-002 · Wash Validation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Verification that parts washer cycle meets cleanliness requirements.' }, { heading: 'Checks', text: '<ul><li><span class="param">TOC</span> of final rinse: < 500 ppb</li><li><span class="param">Conductivity</span>: < 1.3 \u00b5S/cm</li><li><span class="param">Visual inspection</span>: no residue, staining, or particulate</li><li>Results recorded in wash validation log</li></ul>' }] },
    'sop-pw-003': { title: 'SOP-PW-003 · Parts Handling & Storage', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Handling requirements for clean and sterile parts to prevent recontamination.' }, { heading: 'Requirements', text: '<ul><li>Clean parts: use within <span class="param">72 hours</span> or re-wash</li><li>Sterile parts: use within <span class="param">30 days</span> if double-wrapped</li><li>Label all parts with wash/sterilisation date</li><li>Store on designated racks \u2014 do not mix clean and dirty</li><li>Gloved handling only in clean and sterile areas</li></ul>' }] },
    'log-pw-cyc': { title: 'LOG · Wash Cycle History', tag: 'log', sections: [{ heading: 'Recent Cycles', text: '<div class="param">Cycle #1247 \u2014 Standard Glassware \u2014 PASS</div><div class="param">Cycle #1246 \u2014 Heavy Duty \u2014 PASS</div><div class="param">Cycle #1245 \u2014 Standard Glassware \u2014 PASS</div><div class="param">Last failure: Cycle #1198 (rinse TOC high \u2014 re-run)</div>' }] },
    'sop-ac-001': { title: 'SOP-AC-001 · Autoclave Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for steam sterilisation of process components and wrapped goods.' }, { heading: 'Procedure', text: '<ol><li>Verify chamber is clean and drain is clear</li><li>Load items \u2014 do not exceed <span class="param">80% capacity</span></li><li>Place <span class="param">biological indicator (BI)</span> in the centre of the load</li><li>Place <span class="param">chemical indicator</span> tape on all packs</li><li>Select cycle: <span class="param">Wrapped Goods \u2014 121\u00b0C, 20 min</span></li><li>Start cycle and verify chamber reaches temperature</li><li>On completion, verify <span class="param">drying phase</span> completed</li><li>Remove load with heat-resistant gloves</li><li>Retrieve BI and incubate per SOP-AC-002</li></ol>' }] },
    'sop-ac-002': { title: 'SOP-AC-002 · Biological Indicator Reading', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Procedure for incubation and reading of biological indicators post-autoclave.' }, { heading: 'Procedure', text: '<ol><li>Retrieve BI from autoclave load</li><li>Crush ampoule to activate growth media</li><li>Incubate at <span class="param">56\u00b0C for 48 hours</span></li><li>Read result: <span class="param">no colour change = PASS</span></li><li><span class="warn">Colour change (yellow \u2192 purple) = FAIL \u2014 quarantine all items from that load</span></li><li>Record result in sterilisation log</li></ol>' }] },
    'spec-ac-getinge': { title: 'SPEC-AC · Getinge GSS 6713', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Getinge</div><div class="param">Model: GSS 6713</div><div class="param">Chamber volume: 710L</div><div class="param">Max temperature: 138\u00b0C</div><div class="param">Max pressure: 3.5 bar</div><div class="param">Qualification: IQ/OQ/PQ completed 2025-04-20</div>' }] },
    'log-ac-cyc': { title: 'LOG · Sterilisation Cycle Log', tag: 'log', sections: [{ heading: 'Recent Cycles', text: '<div class="param">Cycle #892 \u2014 Wrapped Goods 121\u00b0C \u2014 PASS (BI negative)</div><div class="param">Cycle #891 \u2014 Liquid 121\u00b0C \u2014 PASS</div><div class="param">Cycle #890 \u2014 Wrapped Goods 121\u00b0C \u2014 PASS</div><div class="param">Last BI fail: Cycle #834 (gasket replaced)</div>' }] },
    'log-rack-inv': { title: 'LOG · Parts Inventory', tag: 'log', sections: [{ heading: 'Current Contents', text: '<div class="param">Bioreactor sampling assemblies x4</div><div class="param">ATF tubing sets x6</div><div class="param">pH/DO\u2082 probe caps x8</div><div class="param">Aseptic connectors x12</div><div class="param">Oldest item: 2 days (within hold time)</div>' }] },
    'sop-ct-001': { title: 'SOP-CT-001 · Controller Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for the Sartorius BIOSTAT STR bioreactor controller.' }, { heading: 'Procedure', text: '<ol><li>Power on controller and wait for self-test</li><li>Verify all probe connections (pH, DO\u2082, temp, level)</li><li>Load recipe from validated library</li><li>Confirm setpoints match batch record</li><li>Start cascade control loops</li><li>Monitor alarm dashboard \u2014 acknowledge within 5 min</li></ol>' }] },
    'spec-ct': { title: 'SPEC-CT · Sartorius BIOSTAT STR Controller', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Sartorius</div><div class="param">Platform: BIOSTAT STR</div><div class="param">Software: BioPAT MFCS/DA</div><div class="param">Cascade loops: pH, DO\u2082, Temperature, Level</div><div class="param">Probe inputs: 8 analogue + 4 digital</div><div class="param">Qualification: IQ/OQ/PQ completed</div>' }] },
    'sop-gas-001': { title: 'SOP-GAS-001 · Gas Supply Setup', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Setup and calibration of gas supply panel for bioreactor operation.' }, { heading: 'Procedure', text: '<ol><li>Verify cylinder pressures (O\u2082 > 50 bar, CO\u2082 > 30 bar, N\u2082 > 50 bar)</li><li>Open isolation valves on manifold</li><li>Purge lines for 30 sec at 2 SLPM</li><li>Verify MFC zero and span calibration</li><li>Set initial flows per batch record</li><li>Confirm overlay N\u2082 active</li></ol>' }] },
    'spec-gas': { title: 'SPEC-GAS · Bronkhorst EL-FLOW Select', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Bronkhorst</div><div class="param">Model: EL-FLOW Select F-201CV</div><div class="param">Flow range: 0.01\u20135.0 SLPM</div><div class="param">Accuracy: \u00b10.5% of reading + 0.1% FS</div><div class="param">Control: RS-485 / 4\u201320mA</div>' }] },
    'sop-vc-001': { title: 'SOP-VC-001 · Vi-CELL BLU Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for the Beckman Coulter Vi-CELL BLU automated cell counter.' }, { heading: 'Procedure', text: '<ol><li>Power on and run daily QC (beads)</li><li>Load samples into carousel (max 24 positions)</li><li>Select method (CHO Default)</li><li>Initiate run \u2014 ~2.5 min per sample</li><li>Review results: VCD, viability, diameter histogram</li><li>Export to LIMS</li></ol>' }] },
    'spec-vc': { title: 'SPEC-VC · Beckman Vi-CELL BLU', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Beckman Coulter</div><div class="param">Model: Vi-CELL BLU</div><div class="param">Method: Trypan blue dye exclusion</div><div class="param">Throughput: 24 samples / carousel</div><div class="param">Range: 5\u00d710\u2074 \u2014 1\u00d710\u2077 cells/mL</div><div class="param">Sample volume: 500 \u03bcL</div>' }] },
    'sop-cx-001': { title: 'SOP-CX-001 · Cedex HiRes Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for the Roche Cedex HiRes automated cell analyser.' }, { heading: 'Procedure', text: '<ol><li>Power on and run system check</li><li>Load samples into cassette</li><li>Select measurement protocol</li><li>Review cell images \u2014 morphology, aggregation</li><li>Confirm VCD and viability vs Vi-CELL BLU</li></ol>' }] },
    'spec-cx': { title: 'SPEC-CX · Roche Cedex HiRes', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Roche</div><div class="param">Model: Cedex HiRes</div><div class="param">Method: Image-based cell analysis</div><div class="param">Metrics: VCD, viability, diameter, aggregation, morphology</div><div class="param">Throughput: ~90 sec per sample</div>' }] },
    'sop-bsc-001': { title: 'SOP-BSC-001 · BSC Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Operating procedure for the Thermo Herasafe 2030i biosafety cabinet.' }, { heading: 'Procedure', text: '<ol><li>Switch on and allow 15 min airflow stabilisation</li><li>Wipe down with 70% IPA</li><li>Verify downflow alarm is clear</li><li>Perform aseptic work \u2014 minimise arm movement</li><li>UV decontamination cycle after use (30 min)</li><li>Log usage in room logbook</li></ol>' }] },
    'spec-bsc': { title: 'SPEC-BSC · Thermo Herasafe 2030i', tag: 'spec', sections: [{ heading: 'Specification', text: '<div class="param">Manufacturer: Thermo Fisher</div><div class="param">Model: Herasafe 2030i</div><div class="param">Class: II Type A2</div><div class="param">Width: 1.8m (6 ft)</div><div class="param">Downflow velocity: 0.33 m/s</div><div class="param">HEPA filter: H14, 99.999% MPPS</div>' }] },
    'sop-tw-001': { title: 'SOP-TW-001 · Tube Welding Procedure', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Aseptic tube welding for single-use connections.' }, { heading: 'Procedure', text: '<ol><li>Verify blade counter (replace at 200 welds)</li><li>Load tubing into clamps (match ID sizes)</li><li>Initiate weld cycle</li><li>Visual inspection \u2014 no deformation, full seal</li><li>Pull test (10N for 10 sec)</li><li>Record weld in batch record</li></ol>' }] },
    'sop-sf-001': { title: 'SOP-SF-001 · Capsule Filter Operation', tag: 'sop', sections: [{ heading: 'Purpose', text: 'Sterile filtration of prepared media through 0.2\u03bcm capsule filters.' }, { heading: 'Procedure', text: '<ol><li>Pre-wet filter with WFI (10 L/m\u00b2)</li><li>Perform pre-use integrity test (bubble point)</li><li>Connect to media vessel via tube weld</li><li>Filter at \u2264 1.0 bar differential pressure</li><li>Post-use integrity test \u2014 bubble point \u2265 3.2 bar</li><li>Record results in batch record</li></ol>' }] }
  };

export var DOC_QUERY_RESPONSES = {
    'sampling': 'Daily sampling is performed at 06:00 (Cedex Bio HT for metabolites, Vi-Cell XR for cell count, BGA for pH/gases) and 14:00 (titer by Protein A HPLC, osmolality). Samples must be analysed within 15 minutes of collection. Results are entered into the batch record within 30 minutes.',
    'cedex': 'The Cedex Bio HT analyses glucose, lactate, glutamine, glutamate, NH4+, Na+, K+, and osmolality. Requires 0.5mL sample, ~12 min run time. Daily QC cartridge must pass before samples. Results exported to LIMS.',
    'vi-cell': 'Vi-Cell XR measures viable cell density (VCD), total cell density, viability %, and average cell diameter. Uses 1.0mL sample with CHO-Perfusion cell type profile. Run time ~2.5 min. Sample must be analysed within 15 min of collection.',
    'viability': 'Viability is measured by Vi-Cell XR using trypan blue exclusion. Acceptance criteria: > 80% (alert triggered if < 90%). If viability drops below 80%, immediately notify shift lead and QA per SOP-BR-001.',
    'perfusion': 'Perfusion rate is calculated as CSPR \u00d7 VCD / 1000, targeting 30\u201350 pL/cell/day. VVD range: 1.0\u20133.0. Feed ramp: batch mode Days 0\u20133, ramp to 1.5 VVD Days 3\u20135, then CSPR-calculated rate from Day 5+.',
    'bleed': 'Bleed is initiated when VCD exceeds 50 \u00d7 10\u2076/mL, targeting maintenance at 40\u201350 \u00d7 10\u2076/mL. Rate calculated as: (VCD\u2080 \u2212 VCD_target) / VCD\u2080 \u00d7 perfusion rate. Adjusted on DeltaV.',
    'cip': 'CIP sequence: WFI pre-rinse (50\u00b0C, 15 min) \u2192 0.5M NaOH caustic wash (70\u00b0C, 30 min) \u2192 0.1M H\u2083PO\u2084 acid rinse (25\u00b0C, 15 min) \u2192 WFI final rinse. TOC must be < 500 ppb, conductivity < 1.3 \u00b5S/cm.',
    'calibration': 'pH calibration: two-point (pH 4.01 and 7.00), slope 95\u2013105%, offset \u00b1 0.05. DO\u2082 calibration: two-point (0% N\u2082 and 100% air saturation), T90 < 60 seconds. Performed pre-campaign and weekly.',
    'atf': 'The ATF6 system uses 0.2\u00b5m PES hollow fibers (3000 fibers, 4.7 m\u00b2 area). Exchange rate: 0.8\u20131.5/min. Integrity tested by pressure decay: 0.5 bar, 10 min, < 0.02 bar drop to pass.',
    'protein a': 'Protein A capture uses MabSelect SuRe LX resin at 30 g/L capacity. Elution at pH 3.5 with 100mM glycine, neutralised to pH 5.5 within 30 min. Current cycle: 142 of 200. Step yield: 92.3%, HCP < 50 ppm.',
    'ph': 'pH is controlled at setpoint 7.00 (range 6.90\u20137.10) during N stage production. Monitored inline with calibrated probe. BGA cross-check at daily sampling. Deviation trigger: out of range for > 30 minutes.',
    'temperature': 'Temperature setpoint is 36.5\u00b0C for N stage (range 36.0\u201337.0\u00b0C) and 37.0\u00b0C for N-1 seed. Controlled via bioreactor jacket. Probe accuracy: \u00b1 0.1\u00b0C per equipment spec.',
    'glucose': 'Glucose is supplemented at 8 g/L in CD CHO media. Monitored daily via Cedex Bio HT. Alert threshold: < 3.0 g/L. Critical limit: < 2.0 g/L. Feed rate adjusted to maintain adequate glucose.'
  };

// ══════════════════════════════════════════════════════════════════
//  EQUIPMENT HISTORY — sample data for the HISTORY tab
// ══════════════════════════════════════════════════════════════════

export var EQUIP_HISTORY = {
  'BR': {
    deviations: [
      { id: 'DEV-2026-0041', date: '2026-03-12', severity: 'major', title: 'pH excursion during feed transition — dropped to 6.72 for 45 min', status: 'open', capa: 'CAPA-2026-018' },
      { id: 'DEV-2026-0033', date: '2026-02-28', severity: 'minor', title: 'DO₂ probe drift >5% from BGA reference at daily sampling', status: 'closed', capa: 'CAPA-2026-014' },
      { id: 'DEV-2026-0027', date: '2026-02-10', severity: 'critical', title: 'Foam-out event — loss of ~40L culture volume through exhaust filter', status: 'closed', capa: 'CAPA-2026-011' },
      { id: 'DEV-2026-0019', date: '2026-01-15', severity: 'minor', title: 'Temperature overshoot to 37.8°C on jacket valve transition', status: 'closed', capa: null },
      { id: 'DEV-2025-0112', date: '2025-12-03', severity: 'minor', title: 'Impeller speed fluctuation ±15 RPM during overnight run', status: 'closed', capa: null },
      { id: 'DEV-2025-0098', date: '2025-11-14', severity: 'major', title: 'Single-use bag integrity failure detected during hold test', status: 'closed', capa: 'CAPA-2025-044' },
      { id: 'DEV-2025-0081', date: '2025-10-22', severity: 'minor', title: 'Feed pump occlusion alarm — tubing kinked at roller head', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-03-10', type: 'planned', title: 'Quarterly load cell calibration — 4-point check', status: 'complete', tech: 'M. Chen' },
      { date: '2026-02-14', type: 'unplanned', title: 'Impeller shaft bearing replacement — vibration detected', status: 'complete', tech: 'D. Murphy' },
      { date: '2026-01-08', type: 'planned', title: 'Annual motor service & belt alignment', status: 'complete', tech: 'K. Walsh' },
      { date: '2025-12-15', type: 'planned', title: 'Gas MFC verification — O₂/CO₂/N₂/Air flow check', status: 'complete', tech: 'M. Chen' },
      { date: '2025-11-20', type: 'unplanned', title: 'Jacket valve actuator replacement — slow response', status: 'complete', tech: 'P. O\'Brien' },
      { date: '2025-10-01', type: 'planned', title: 'Bi-annual vessel inspection & gasket replacement', status: 'complete', tech: 'K. Walsh' }
    ],
    calibrations: [
      { instrument: 'pH probe', lastCal: '2026-03-10', nextDue: '2026-04-10', status: 'current' },
      { instrument: 'DO₂ probe', lastCal: '2026-02-15', nextDue: '2026-03-15', status: 'due-soon' },
      { instrument: 'Temperature RTD', lastCal: '2026-01-20', nextDue: '2026-07-20', status: 'current' },
      { instrument: 'Pressure transducer', lastCal: '2025-11-01', nextDue: '2026-02-01', status: 'overdue' },
      { instrument: 'Load cells (×4)', lastCal: '2026-03-10', nextDue: '2026-06-10', status: 'current' },
      { instrument: 'Gas MFCs (×4)', lastCal: '2025-12-15', nextDue: '2026-06-15', status: 'current' }
    ],
    cipSip: [
      { date: '2026-03-01', type: 'CIP', result: 'PASS', duration: '45 min', detail: 'Conductivity <1.0 μS/cm' },
      { date: '2026-03-01', type: 'SIP', result: 'PASS', duration: '30 min', detail: 'F₀ = 28 min (≥15 required)' },
      { date: '2026-02-01', type: 'CIP', result: 'PASS', duration: '48 min', detail: 'Conductivity <1.0 μS/cm' },
      { date: '2026-02-01', type: 'SIP', result: 'PASS', duration: '32 min', detail: 'F₀ = 30 min' },
      { date: '2026-01-04', type: 'CIP', result: 'FAIL', duration: '52 min', detail: 'TOC 620 ppb (limit 500) — re-cleaned' },
      { date: '2026-01-04', type: 'CIP', result: 'PASS', duration: '46 min', detail: 'Re-clean: TOC 180 ppb' },
      { date: '2026-01-04', type: 'SIP', result: 'PASS', duration: '31 min', detail: 'F₀ = 27 min' }
    ],
    trends: [
      { parameter: 'pH probe drift', unit: 'mV', points: [2, 3, 5, 4, 8, 12, 15, 11, 9, 18, 22, 14] },
      { parameter: 'DO₂ response (T90)', unit: 's', points: [8, 9, 9, 10, 11, 12, 14, 13, 15, 16, 14, 18] },
      { parameter: 'Jacket valve response', unit: 'ms', points: [120, 125, 130, 128, 145, 160, 180, 210, 195, 170, 155, 140] }
    ]
  },

  'ATF': {
    deviations: [
      { id: 'DEV-2026-0038', date: '2026-03-08', severity: 'major', title: 'Integrity test failure — pressure decay 0.04 bar (limit 0.02)', status: 'open', capa: 'CAPA-2026-017' },
      { id: 'DEV-2026-0022', date: '2026-01-25', severity: 'minor', title: 'Flow rate drop 15% — partial fiber fouling suspected', status: 'closed', capa: null },
      { id: 'DEV-2025-0095', date: '2025-11-08', severity: 'minor', title: 'Diaphragm pump pulsation irregularity at high exchange rate', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-03-08', type: 'unplanned', title: 'Hollow fiber cartridge replacement — integrity failure', status: 'complete', tech: 'R. Kelly' },
      { date: '2026-01-15', type: 'planned', title: 'Diaphragm pump service — membrane and valve check', status: 'complete', tech: 'D. Murphy' },
      { date: '2025-10-10', type: 'planned', title: 'Annual controller firmware update & sensor check', status: 'complete', tech: 'R. Kelly' }
    ],
    calibrations: [
      { instrument: 'Feed pressure', lastCal: '2026-02-01', nextDue: '2026-08-01', status: 'current' },
      { instrument: 'Retentate pressure', lastCal: '2026-02-01', nextDue: '2026-08-01', status: 'current' },
      { instrument: 'Permeate pressure', lastCal: '2026-02-01', nextDue: '2026-08-01', status: 'current' },
      { instrument: 'Flow meter', lastCal: '2025-12-01', nextDue: '2026-03-01', status: 'overdue' }
    ],
    cipSip: [
      { date: '2026-03-08', type: 'CIP', result: 'PASS', duration: '35 min', detail: 'Post-cartridge swap' },
      { date: '2026-02-01', type: 'CIP', result: 'PASS', duration: '38 min', detail: 'Routine monthly' }
    ],
    trends: [
      { parameter: 'TMP', unit: 'bar', points: [0.12, 0.14, 0.15, 0.18, 0.20, 0.22, 0.28, 0.32, 0.15, 0.14, 0.13, 0.14] },
      { parameter: 'Permeate flux', unit: 'L/m²/hr', points: [45, 44, 42, 40, 38, 35, 30, 26, 44, 45, 44, 43] }
    ]
  },

  'MEDIA PREP': {
    deviations: [
      { id: 'DEV-2026-0035', date: '2026-03-05', severity: 'minor', title: 'Osmolality 328 mOsm/kg — above 320 target range', status: 'closed', capa: null },
      { id: 'DEV-2026-0024', date: '2026-02-02', severity: 'major', title: 'Supplement powder clumping — incomplete dissolution after 60 min', status: 'closed', capa: 'CAPA-2026-012' },
      { id: 'DEV-2025-0105', date: '2025-11-28', severity: 'minor', title: 'pH reading 7.45 pre-sterile filtration — adjusted with CO₂ sparge', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-02-20', type: 'planned', title: 'Mixer blade inspection & torque calibration', status: 'complete', tech: 'K. Walsh' },
      { date: '2025-12-05', type: 'planned', title: 'Load cell calibration — 5-point linearity check', status: 'complete', tech: 'M. Chen' },
      { date: '2025-09-15', type: 'planned', title: 'Annual vessel frame inspection & weld check', status: 'complete', tech: 'K. Walsh' }
    ],
    calibrations: [
      { instrument: 'Load cells (×4)', lastCal: '2025-12-05', nextDue: '2026-03-05', status: 'overdue' },
      { instrument: 'Temperature probe', lastCal: '2026-01-10', nextDue: '2026-07-10', status: 'current' },
      { instrument: 'Conductivity meter', lastCal: '2026-02-15', nextDue: '2026-05-15', status: 'current' }
    ],
    cipSip: [
      { date: '2026-03-02', type: 'CIP', result: 'PASS', duration: '40 min', detail: 'Conductivity <0.8 μS/cm' },
      { date: '2026-02-15', type: 'CIP', result: 'PASS', duration: '42 min', detail: 'Post-supplement prep' }
    ],
    trends: [
      { parameter: 'Dissolution time', unit: 'min', points: [35, 38, 36, 40, 42, 55, 48, 45, 38, 36, 35, 37] },
      { parameter: 'Post-mix osmolality', unit: 'mOsm', points: [305, 308, 312, 310, 315, 318, 328, 320, 312, 308, 310, 306] }
    ]
  },

  'PARTS WASHER': {
    deviations: [
      { id: 'DEV-2026-0030', date: '2026-02-18', severity: 'minor', title: 'Final rinse conductivity 1.8 μS/cm — limit 1.3 μS/cm', status: 'closed', capa: null },
      { id: 'DEV-2025-0088', date: '2025-10-30', severity: 'major', title: 'Thermal disinfection cycle abort — heater element failure', status: 'closed', capa: 'CAPA-2025-040' }
    ],
    maintenance: [
      { date: '2026-03-01', type: 'planned', title: 'Quarterly spray arm inspection & nozzle descale', status: 'complete', tech: 'P. O\'Brien' },
      { date: '2025-11-01', type: 'unplanned', title: 'Heater element replacement (2 of 4)', status: 'complete', tech: 'D. Murphy' },
      { date: '2025-09-01', type: 'planned', title: 'Annual pump seal replacement & door gasket check', status: 'complete', tech: 'P. O\'Brien' }
    ],
    calibrations: [
      { instrument: 'Temperature probe', lastCal: '2026-01-15', nextDue: '2026-07-15', status: 'current' },
      { instrument: 'Conductivity sensor', lastCal: '2026-01-15', nextDue: '2026-04-15', status: 'current' }
    ],
    cipSip: [],
    trends: [
      { parameter: 'Rinse conductivity', unit: 'μS/cm', points: [0.8, 0.9, 0.8, 1.0, 1.1, 1.2, 1.8, 1.1, 0.9, 0.8, 0.9, 0.8] },
      { parameter: 'Cycle duration', unit: 'min', points: [92, 93, 92, 94, 95, 98, 105, 96, 93, 92, 93, 92] }
    ]
  },

  'AUTOCLAVE': {
    deviations: [
      { id: 'DEV-2026-0015', date: '2026-01-08', severity: 'major', title: 'BI positive result — load quarantined, investigation initiated', status: 'closed', capa: 'CAPA-2026-006' },
      { id: 'DEV-2025-0076', date: '2025-10-05', severity: 'minor', title: 'Door seal leak — steam visible at gasket edge', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-02-28', type: 'planned', title: 'Annual pressure vessel inspection — PSSR compliance', status: 'complete', tech: 'External — TÜV' },
      { date: '2026-01-10', type: 'unplanned', title: 'Door gasket replacement — leak detected', status: 'complete', tech: 'P. O\'Brien' },
      { date: '2025-08-15', type: 'planned', title: 'Safety valve recertification', status: 'complete', tech: 'External — TÜV' }
    ],
    calibrations: [
      { instrument: 'Chamber temp probe', lastCal: '2026-02-28', nextDue: '2026-08-28', status: 'current' },
      { instrument: 'Drain temp probe', lastCal: '2026-02-28', nextDue: '2026-08-28', status: 'current' },
      { instrument: 'Pressure gauge', lastCal: '2026-02-28', nextDue: '2026-08-28', status: 'current' }
    ],
    cipSip: [],
    trends: [
      { parameter: 'F₀ achieved', unit: 'min', points: [18, 19, 18, 20, 19, 21, 22, 20, 19, 18, 19, 20] },
      { parameter: 'Heat-up time', unit: 'min', points: [12, 12, 13, 13, 14, 15, 16, 14, 13, 12, 12, 13] }
    ]
  },

  'HARVEST': {
    deviations: [
      { id: 'DEV-2026-0036', date: '2026-03-06', severity: 'minor', title: 'Turbidity spike to 45 NTU — investigated as filter breakthrough', status: 'closed', capa: null },
      { id: 'DEV-2025-0100', date: '2025-11-18', severity: 'minor', title: 'Level sensor reading 8% high vs manual dip check', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-02-10', type: 'planned', title: 'Level sensor recalibration — 3-point wet check', status: 'complete', tech: 'M. Chen' },
      { date: '2025-10-20', type: 'planned', title: 'Valve actuator service — harvest outlet and drain', status: 'complete', tech: 'D. Murphy' }
    ],
    calibrations: [
      { instrument: 'Level sensor', lastCal: '2026-02-10', nextDue: '2026-05-10', status: 'current' },
      { instrument: 'Turbidity probe', lastCal: '2025-12-01', nextDue: '2026-03-01', status: 'overdue' },
      { instrument: 'Temperature probe', lastCal: '2026-01-15', nextDue: '2026-07-15', status: 'current' }
    ],
    cipSip: [
      { date: '2026-03-01', type: 'CIP', result: 'PASS', duration: '35 min', detail: 'TOC 120 ppb' }
    ],
    trends: [
      { parameter: 'Turbidity', unit: 'NTU', points: [8, 10, 9, 12, 15, 18, 45, 14, 10, 9, 8, 10] },
      { parameter: 'Hold temperature', unit: '°C', points: [4.1, 4.0, 4.2, 4.1, 4.3, 4.2, 4.0, 4.1, 4.2, 4.0, 4.1, 4.1] }
    ]
  },

  'PROTEIN A': {
    deviations: [
      { id: 'DEV-2026-0029', date: '2026-02-15', severity: 'minor', title: 'Back pressure 0.35 MPa — approaching 0.4 MPa limit', status: 'closed', capa: null },
      { id: 'DEV-2025-0090', date: '2025-11-02', severity: 'major', title: 'Yield drop to 84% — resin capacity degradation at cycle 180', status: 'closed', capa: 'CAPA-2025-042' }
    ],
    maintenance: [
      { date: '2026-01-20', type: 'planned', title: 'AKTA system PM — pump head replacement, UV cell clean', status: 'complete', tech: 'GE Service' },
      { date: '2025-11-05', type: 'unplanned', title: 'Column repacking — resin replacement after capacity loss', status: 'complete', tech: 'R. Kelly' }
    ],
    calibrations: [
      { instrument: 'UV detector', lastCal: '2026-01-20', nextDue: '2026-07-20', status: 'current' },
      { instrument: 'pH sensor (inline)', lastCal: '2026-02-01', nextDue: '2026-05-01', status: 'current' },
      { instrument: 'Conductivity sensor', lastCal: '2026-02-01', nextDue: '2026-05-01', status: 'current' },
      { instrument: 'Pressure transducers', lastCal: '2025-10-15', nextDue: '2026-01-15', status: 'overdue' }
    ],
    cipSip: [
      { date: '2026-03-01', type: 'CIP', result: 'PASS', duration: '25 min', detail: '0.1M NaOH sanitisation' },
      { date: '2026-02-15', type: 'CIP', result: 'PASS', duration: '25 min', detail: 'Post-campaign strip' }
    ],
    trends: [
      { parameter: 'Step yield', unit: '%', points: [95, 94, 94, 93, 92, 91, 88, 84, 94, 95, 94, 93] },
      { parameter: 'Back pressure', unit: 'MPa', points: [0.18, 0.20, 0.22, 0.24, 0.26, 0.30, 0.35, 0.32, 0.20, 0.18, 0.20, 0.22] }
    ]
  },

  'UF/DF': {
    deviations: [
      { id: 'DEV-2026-0032', date: '2026-02-22', severity: 'minor', title: 'Flux decline 20% during diafiltration — membrane fouling', status: 'closed', capa: null },
      { id: 'DEV-2025-0108', date: '2025-12-01', severity: 'minor', title: 'TMP alarm at 1.8 bar — reduced feed rate to compensate', status: 'closed', capa: null }
    ],
    maintenance: [
      { date: '2026-02-25', type: 'planned', title: 'Membrane cassette NWP check & integrity test', status: 'complete', tech: 'R. Kelly' },
      { date: '2025-12-10', type: 'planned', title: 'Pump seal replacement — feed and retentate pumps', status: 'complete', tech: 'D. Murphy' }
    ],
    calibrations: [
      { instrument: 'Feed pressure', lastCal: '2026-01-15', nextDue: '2026-07-15', status: 'current' },
      { instrument: 'Retentate pressure', lastCal: '2026-01-15', nextDue: '2026-07-15', status: 'current' },
      { instrument: 'Permeate pressure', lastCal: '2026-01-15', nextDue: '2026-07-15', status: 'current' },
      { instrument: 'UV monitor', lastCal: '2025-11-01', nextDue: '2026-02-01', status: 'overdue' }
    ],
    cipSip: [
      { date: '2026-02-25', type: 'CIP', result: 'PASS', duration: '30 min', detail: 'NWP recovery 95%' }
    ],
    trends: [
      { parameter: 'NWP (normalised water permeability)', unit: 'L/m²/hr/bar', points: [120, 118, 115, 112, 108, 105, 100, 95, 118, 120, 118, 115] },
      { parameter: 'TMP', unit: 'bar', points: [0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.8, 1.5, 0.9, 0.8, 0.9, 1.0] }
    ]
  },

  'CELL COUNTER': {
    deviations: [
      { id: 'DEV-2026-0025', date: '2026-02-05', severity: 'minor', title: 'Sample carousel jam — position 18 misalignment', status: 'closed', capa: null },
      { id: 'DEV-2025-0092', date: '2025-11-05', severity: 'major', title: 'VCD reading 12% lower than manual hemocytometer — optics drift', status: 'closed', capa: 'CAPA-2025-043' }
    ],
    maintenance: [
      { date: '2026-03-01', type: 'planned', title: 'Quarterly optics cleaning & reference bead verification', status: 'complete', tech: 'M. Chen' },
      { date: '2025-11-08', type: 'unplanned', title: 'Optics module realignment — LED replacement', status: 'complete', tech: 'Beckman Service' },
      { date: '2025-08-01', type: 'planned', title: 'Annual PM — pump tubing, syringes, carousel service', status: 'complete', tech: 'Beckman Service' }
    ],
    calibrations: [
      { instrument: 'Reference beads', lastCal: '2026-03-01', nextDue: '2026-06-01', status: 'current' },
      { instrument: 'Trypan blue validation', lastCal: '2026-03-01', nextDue: '2026-06-01', status: 'current' }
    ],
    cipSip: [],
    trends: [
      { parameter: 'CV% (repeatability)', unit: '%', points: [3.2, 3.4, 3.5, 3.8, 4.2, 5.1, 6.8, 3.8, 3.2, 3.0, 3.1, 3.3] },
      { parameter: 'Hemocytometer correlation', unit: '%', points: [98, 97, 96, 95, 94, 92, 88, 97, 98, 98, 97, 97] }
    ]
  },

  'BSC': {
    deviations: [
      { id: 'DEV-2025-0085', date: '2025-10-25', severity: 'major', title: 'Downflow velocity 0.28 m/s — below 0.30 m/s minimum', status: 'closed', capa: 'CAPA-2025-039' }
    ],
    maintenance: [
      { date: '2026-02-15', type: 'planned', title: 'Annual HEPA filter integrity test & airflow certification', status: 'complete', tech: 'External — CleanAir' },
      { date: '2025-08-15', type: 'planned', title: 'UV lamp replacement (2000h reached)', status: 'complete', tech: 'M. Chen' }
    ],
    calibrations: [
      { instrument: 'Downflow velocity', lastCal: '2026-02-15', nextDue: '2027-02-15', status: 'current' },
      { instrument: 'Inflow velocity', lastCal: '2026-02-15', nextDue: '2027-02-15', status: 'current' },
      { instrument: 'HEPA integrity (DOP)', lastCal: '2026-02-15', nextDue: '2027-02-15', status: 'current' }
    ],
    cipSip: [],
    trends: [
      { parameter: 'Downflow velocity', unit: 'm/s', points: [0.38, 0.37, 0.36, 0.35, 0.33, 0.31, 0.28, 0.38, 0.37, 0.37, 0.36, 0.36] },
      { parameter: 'Particle count (0.5μm)', unit: '/m³', points: [0, 0, 0, 1, 0, 2, 5, 0, 0, 0, 0, 1] }
    ]
  }
};

// ══════════════════════════════════════════════════════════════════
//  TRAINING DATA — operator qualifications & shift coverage
// ══════════════════════════════════════════════════════════════════

// Current shift roster (sample: Day Shift A)
export var SHIFT_ROSTER = {
  shift: 'Day A',
  date: '2026-03-16',
  operators: [
    { id: 'OP-001', name: 'S. Murphy', role: 'Senior Operator', yearsExp: 8 },
    { id: 'OP-002', name: 'L. Chen', role: 'Operator II', yearsExp: 3 },
    { id: 'OP-003', name: 'K. Byrne', role: 'Operator I', yearsExp: 1 },
    { id: 'OP-004', name: 'R. Patel', role: 'Operator II', yearsExp: 4 },
    { id: 'OP-005', name: 'M. Kowalski', role: 'Operator I (Trainee)', yearsExp: 0.3 }
  ]
};

// Equipment training requirements — keyed by equipment type (matches PROCESS_DATA keys)
// Each entry: required = minimum trained operators per shift, qualified = IDs of qualified operators
export var TRAINING_MATRIX = {
  'BR': {
    label: 'Production Bioreactors',
    required: 3,
    qualified: ['OP-001', 'OP-002', 'OP-004'],
    ojts: [
      { operator: 'OP-003', status: 'in-progress', completion: 65, mentor: 'S. Murphy', startDate: '2026-01-10', targetDate: '2026-04-15' },
      { operator: 'OP-005', status: 'not-started', completion: 0, mentor: null, startDate: null, targetDate: '2026-08-01' }
    ],
    sopRefs: ['WX-SOP-1001-03', 'WX-SOP-1003-03'],
    lastAssessment: '2026-02-28',
    nextAssessment: '2026-08-28'
  },
  'ATF': {
    label: 'ATF Systems',
    required: 2,
    qualified: ['OP-001', 'OP-004'],
    ojts: [
      { operator: 'OP-002', status: 'in-progress', completion: 80, mentor: 'S. Murphy', startDate: '2025-11-01', targetDate: '2026-04-01' }
    ],
    sopRefs: ['WX-SOP-1001-03'],
    lastAssessment: '2026-01-15',
    nextAssessment: '2026-07-15'
  },
  'MEDIA PREP': {
    label: 'Media Preparation',
    required: 2,
    qualified: ['OP-001', 'OP-002', 'OP-004'],
    ojts: [
      { operator: 'OP-003', status: 'in-progress', completion: 90, mentor: 'L. Chen', startDate: '2025-10-15', targetDate: '2026-03-20' }
    ],
    sopRefs: ['WX-SOP-1002-03'],
    lastAssessment: '2026-03-01',
    nextAssessment: '2026-09-01'
  },
  'SEED BR': {
    label: 'Seed Bioreactors (50L)',
    required: 2,
    qualified: ['OP-001', 'OP-002'],
    ojts: [
      { operator: 'OP-004', status: 'in-progress', completion: 40, mentor: 'S. Murphy', startDate: '2026-02-01', targetDate: '2026-06-01' }
    ],
    sopRefs: ['WX-SOP-1001-03'],
    lastAssessment: '2026-02-15',
    nextAssessment: '2026-08-15'
  },
  'SEED BR 20L': {
    label: 'Seed Bioreactors (20L)',
    required: 2,
    qualified: ['OP-001', 'OP-002'],
    ojts: [
      { operator: 'OP-004', status: 'in-progress', completion: 40, mentor: 'S. Murphy', startDate: '2026-02-01', targetDate: '2026-06-01' }
    ],
    sopRefs: ['WX-SOP-1001-03'],
    lastAssessment: '2026-02-15',
    nextAssessment: '2026-08-15'
  },
  'CELL COUNTER': {
    label: 'Vi-CELL BLU Cell Counter',
    required: 2,
    qualified: ['OP-001', 'OP-002', 'OP-003', 'OP-004'],
    ojts: [
      { operator: 'OP-005', status: 'in-progress', completion: 50, mentor: 'L. Chen', startDate: '2026-02-15', targetDate: '2026-05-01' }
    ],
    sopRefs: ['WX-SOP-1003-03'],
    lastAssessment: '2026-03-10',
    nextAssessment: '2026-09-10'
  },
  'BSC': {
    label: 'Biosafety Cabinet',
    required: 2,
    qualified: ['OP-001', 'OP-002', 'OP-003', 'OP-004'],
    ojts: [
      { operator: 'OP-005', status: 'in-progress', completion: 30, mentor: 'R. Patel', startDate: '2026-03-01', targetDate: '2026-06-01' }
    ],
    sopRefs: ['WX-SOP-1004-03'],
    lastAssessment: '2026-03-05',
    nextAssessment: '2026-09-05'
  },
  'PARTS WASHER': {
    label: 'Parts Washer',
    required: 1,
    qualified: ['OP-001', 'OP-003', 'OP-004'],
    ojts: [],
    sopRefs: ['WX-SOP-1005-03'],
    lastAssessment: '2026-01-20',
    nextAssessment: '2026-07-20'
  },
  'AUTOCLAVE': {
    label: 'Autoclave',
    required: 2,
    qualified: ['OP-001'],
    ojts: [
      { operator: 'OP-004', status: 'in-progress', completion: 70, mentor: 'S. Murphy', startDate: '2025-12-01', targetDate: '2026-04-01' }
    ],
    sopRefs: ['WX-SOP-1005-03'],
    lastAssessment: '2026-02-01',
    nextAssessment: '2026-08-01'
  },
  'HARVEST': {
    label: 'Harvest Sump',
    required: 2,
    qualified: ['OP-001', 'OP-002', 'OP-004'],
    ojts: [],
    sopRefs: ['WX-SOP-1001-03'],
    lastAssessment: '2026-02-28',
    nextAssessment: '2026-08-28'
  },
  'PROTEIN A': {
    label: 'Protein A Chromatography',
    required: 2,
    qualified: ['OP-001'],
    ojts: [
      { operator: 'OP-002', status: 'in-progress', completion: 25, mentor: 'S. Murphy', startDate: '2026-02-15', targetDate: '2026-08-15' }
    ],
    sopRefs: [],
    lastAssessment: '2026-01-10',
    nextAssessment: '2026-07-10'
  },
  'ION EXCHANGE': {
    label: 'Ion Exchange Chromatography',
    required: 2,
    qualified: ['OP-001'],
    ojts: [
      { operator: 'OP-002', status: 'in-progress', completion: 25, mentor: 'S. Murphy', startDate: '2026-02-15', targetDate: '2026-08-15' }
    ],
    sopRefs: [],
    lastAssessment: '2026-01-10',
    nextAssessment: '2026-07-10'
  },
  'UF/DF': {
    label: 'UF/DF Skid',
    required: 2,
    qualified: ['OP-001'],
    ojts: [
      { operator: 'OP-002', status: 'in-progress', completion: 20, mentor: 'S. Murphy', startDate: '2026-03-01', targetDate: '2026-09-01' }
    ],
    sopRefs: [],
    lastAssessment: '2026-01-10',
    nextAssessment: '2026-07-10'
  },
  'FILL TANK': {
    label: 'Fill Tank',
    required: 2,
    qualified: ['OP-001', 'OP-004'],
    ojts: [],
    sopRefs: [],
    lastAssessment: '2026-02-28',
    nextAssessment: '2026-08-28'
  }
};
