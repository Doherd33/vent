# STANDARD OPERATING PROCEDURE

| Field | Detail |
|---|---|
| **Document Number** | SOP-UP-005 |
| **Title** | Bioreactor Clean-In-Place (CIP) and Steam-In-Place (SIP) Procedure |
| **Revision** | 03 |
| **Effective Date** | 2024-02-01 |
| **Review Date** | 2025-02-01 |
| **Department** | Upstream Processing / Engineering |
| **Author** | T. Brennan – Senior Manufacturing Associate |
| **Reviewed By** | M. Gallagher – Senior Process Engineer |
| **Approved By** | C. O'Brien – QA Manager |
| **Classification** | GMP Controlled Document |

> **UNCONTROLLED WHEN PRINTED** – Always verify currency against the Document Management System before use.

---

## 1. PURPOSE

This SOP defines the procedure for cleaning (CIP) and sterilising (SIP) stirred-tank bioreactor vessels and associated product-contact lines used in upstream biologics manufacturing. The purpose is to ensure that the bioreactor vessel is free from residual biological material, chemical contamination, and microbial contamination prior to each production run, and that a sterile environment is established before media addition and inoculation.

---

## 2. SCOPE

This procedure applies to all upstream processing personnel and engineering staff responsible for performing CIP and SIP on bioreactor vessels (50L, 200L, and 500L) and associated jacketed lines, sample ports, addition ports, and sparger assemblies.

This SOP does not cover CIP/SIP of the ATF hollow fibre system (refer to SOP-UP-004) or media preparation vessels (refer to SOP-CL-002).

---

## 3. REGULATORY REFERENCES

- 21 CFR Part 211.67 – Equipment Cleaning and Maintenance
- EU GMP Annex 1 – Sterilisation
- ICH Q10 – Pharmaceutical Quality System
- PDA Technical Report No. 29 (Revised 2012) – Points to Consider for Cleaning Validation
- Internal: QMS-GEN-001 – Document Control
- Internal: VAL-CIP-UP-001 – CIP Cleaning Validation Report (50L, 200L, 500L Bioreactors)
- Internal: VAL-SIP-UP-001 – SIP Sterilisation Validation Report

---

## 4. DEFINITIONS

| Term | Definition |
|---|---|
| CIP | Clean-In-Place – the process of cleaning equipment without disassembly, using a sequence of rinse and wash steps circulated through the vessel |
| SIP | Steam-In-Place – sterilisation of the assembled bioreactor by passing pressurised steam through the vessel and all product-contact lines |
| WFI | Water for Injection – highest-purity water used for all final rinses and cleaning solution preparation |
| TOC | Total Organic Carbon – measure of residual organic contamination in the final rinse water |
| Conductivity | Measure of ionic content in the final rinse water; used to confirm adequate removal of NaOH cleaning agent |
| F₀ | Lethality factor (sterilising value) – a measure of equivalent sterilisation time at 121°C; required F₀ ≥ 15 for product-contact surfaces |
| Biological Indicator (BI) | A calibrated preparation of highly resistant bacterial spores (Geobacillus stearothermophilus) used to verify that SIP conditions are sufficient to achieve sterility |
| Product-Contact Surface | Any surface that directly contacts cell culture, media, or biological product during processing |
| Hold Time | Maximum allowable time between completion of CIP and start of SIP; and between SIP completion and media addition |

---

## 5. RESPONSIBILITIES

| Role | Responsibility |
|---|---|
| Manufacturing Associate (MA) | Execute CIP sequence, collect rinse samples, document BPR entries |
| Senior Manufacturing Associate (SMA) | Witness CIP critical steps, verify SIP parameters, countersign BPR |
| Engineering Technician | Operate SIP steam connections, verify steam trap operation, sign off SIP hardware checklist |
| QC Analyst | Test final rinse samples (TOC, conductivity, bioburden, pH) |
| QA Representative | Review completed CIP/SIP records, approve for use or reject |

---

## 6. SAFETY PRECAUTIONS

### 6.1 CIP Chemical Safety

6.1.1 **Sodium Hydroxide (0.5M NaOH):** Corrosive. Wear face shield, double gloves, and chemical-resistant apron during connection of NaOH supply lines and any sampling of CIP solutions. Refer to SDS-CHEM-042.

6.1.2 **Phosphoric Acid (0.1M H₃PO₄):** Corrosive. Same PPE as NaOH. Refer to SDS-CHEM-019. Never mix concentrated acid with concentrated NaOH directly.

6.1.3 Rinse area and PPE with water immediately following any chemical contact.

### 6.2 SIP Steam Safety

6.2.1 Steam connections must be performed by a qualified Engineering Technician or SMA with SIP competency training certification (competency record in training file).

6.2.2 Heat-resistant gloves are mandatory for all steam connection and disconnection activities. Never touch bare steam pipe, fittings, or vessel body during SIP – surfaces reach 121°C+.

6.2.3 Never open a steam valve rapidly. Open slowly (1/4 turn at a time) to prevent water hammer.

6.2.4 Verify that all pressure relief valves on the vessel are functional and within calibration before commencing SIP.

6.2.5 During SIP, the bioreactor and all connected lines are under pressure. Maintain a safe exclusion zone around the vessel during the SIP hold phase. Do not attempt to open any port, valve, or fitting while the vessel is under steam pressure.

### 6.3 Biological Contamination Risk

6.3.1 Before commencing CIP, ensure that all residual biological material from the previous run has been deactivated per SOP-ENV-003. Do not perform CIP on a bioreactor that has not been properly deactivated.

6.3.2 Pre-rinse effluent from the first WFI rinse (Step 8.2.1) contains residual biological material and must be collected to the deactivation tank or treated with NaOH to ≥ 0.5M before drain disposal.

---

## 7. EQUIPMENT AND MATERIALS

### 7.1 Equipment

- Bioreactor vessel (50L, 200L, or 500L) with CIP/SIP lines pre-installed per engineering drawing ENG-UP-005
- CIP skid or manual CIP pump system
- Steam generator / site steam supply (minimum 3 bar saturated steam)
- Steam traps (verified operational per PM schedule)
- Calibrated temperature and pressure data logger for SIP (Kaye Validator or equivalent), within calibration
- Conductivity meter (calibrated)
- Calibrated analytical balance

### 7.2 Reagents and Consumables

- WFI (daily released, ≥ specification per QC-WFI record)
- 0.5M NaOH solution (prepared from pharmaceutical-grade NaOH; lot number on BPR)
- 0.1M Phosphoric Acid (H₃PO₄) solution (lot number on BPR)
- Biological Indicator strips: Geobacillus stearothermophilus ATCC 7953, D₁₂₁ ≥ 1.5 min (lot number, manufacturer, expiry date on BPR)
- TOC vials (pre-rinsed, certified low-carbon)
- Sterile sampling syringes and containers for bioburden samples

---

## 8. PROCEDURE

### 8.1 Pre-CIP Preparation

8.1.1 Confirm that the previous production run has been terminated and that all biological material within the bioreactor has been deactivated per SOP-ENV-003 (NaOH fill to ≥ 0.5M, minimum 60 minutes contact time, with agitation). Record deactivation solution lot number, concentration, volume added, and contact time in BPR-UP-001, Section 12.

8.1.2 Drain deactivated material to the site effluent deactivation tank. Confirm drain valve is directed to the correct tank before opening.

8.1.3 Inspect the vessel interior (where accessible via the head plate) for visible residue, biofilm, scale, or damage. Record inspection result in BPR Section 12.

8.1.4 Verify that all CIP supply and return lines are connected per CIP circuit drawing ENG-UP-005. Confirm correct valve alignment with Engineering Technician.

8.1.5 Confirm that all probes and sensitive instrumentation (pH probe, DO probe, foam probe where fitted) have been removed from the vessel before commencing CIP. Do not expose pH or DO probes to NaOH or acid CIP solutions. Store pH probe in 3M KCl. Store DO probe dry at room temperature.

8.1.6 **[W – Witness Required]** Engineering Technician or SMA to verify CIP circuit alignment and probe removal. Sign BPR Section 12.

---

### 8.2 CIP Sequence

The validated CIP sequence is as follows (validated per VAL-CIP-UP-001). Do not deviate from the sequence without written QA approval.

#### Step 1: Pre-Rinse (WFI)

8.2.1.1 Circulate WFI at ≥ 60°C through all product-contact surfaces for **10 minutes**. Flow rate: ≥ 3 vessel volumes per hour.

8.2.1.2 Collect all pre-rinse effluent to the deactivation tank or to a waste container for biological deactivation per SOP-ENV-003 (contains residual biological material).

8.2.1.3 Record WFI temperature, start time, and end time in BPR Section 12.

#### Step 2: Caustic Wash (0.5M NaOH)

8.2.2.1 Circulate **0.5M NaOH** solution at **70°C ± 5°C** for **30 minutes** through all product-contact surfaces.

8.2.2.2 Maintain temperature throughout the wash phase. Record temperature at 5-minute intervals in BPR Section 12.

8.2.2.3 **Acceptance Criterion:** NaOH temperature must be maintained at ≥ 65°C for the full 30 minutes. If temperature drops below 65°C, extend wash time by the period below 65°C. Maximum total caustic wash time: 60 minutes.

> **NOTE – CIP Hold Time for Different Vessel Sizes:** The validated caustic wash hold time of 30 minutes was established in VAL-CIP-UP-001 for the 200L bioreactor using a worst-case soil challenge. The validation report explicitly states that this data applies only to the 200L configuration. However, this SOP is currently applied to 50L and 500L bioreactors using the same 30-minute hold time. No separate validation or scaling justification for the 50L or 500L has been completed. This represents a validation gap and has been escalated in Gap Assessment GA-VAL-2023-004, currently under review by the Validation team and QA. Until resolved, the 30-minute hold time will continue to be applied to all vessel sizes under this SOP.

8.2.2.4 Drain NaOH solution to the site chemical waste drain (NaOH drains are pre-approved by site EHS per EHS-DRAIN-001).

#### Step 3: Intermediate WFI Rinse

8.2.3.1 Circulate WFI at ≥ 60°C for **15 minutes** to remove residual NaOH.

8.2.3.2 At end of rinse, collect a conductivity sample from the vessel drain point.

8.2.3.3 **Acceptance Criterion (intermediate):** Conductivity ≤ 50 µS/cm. This is an in-process check only – not a CIP release criterion. Record result in BPR Section 12. If conductivity > 50 µS/cm, continue rinsing for a further 10 minutes and re-sample.

#### Step 4: Acid Wash (0.1M H₃PO₄)

8.2.4.1 Circulate **0.1M H₃PO₄** solution at **60°C ± 5°C** for **20 minutes** through all product-contact surfaces.

8.2.4.2 Record temperature at 5-minute intervals in BPR Section 12.

8.2.4.3 Acceptance Criterion: Acid temperature maintained at ≥ 55°C throughout. If below 55°C, extend acid wash by the period below temperature. Maximum total acid wash: 40 minutes.

8.2.4.4 Drain acid solution to the chemical waste drain.

#### Step 5: Final WFI Rinse

8.2.5.1 Circulate WFI at ≥ 60°C for a **minimum of 20 minutes**.

8.2.5.2 Continue rinsing until final rinse acceptance criteria are met (see Section 8.3 below).

8.2.5.3 Collect final rinse samples from the drain point during the last 5 minutes of rinsing.

---

### 8.3 CIP Rinse Sample Analysis and Release

8.3.1 Collect final WFI rinse samples at the drain point as follows:
- **Conductivity sample:** 50 mL in a clean conductivity cell
- **pH sample:** 10 mL in a pH-buffered container
- **TOC sample:** 40 mL in a certified TOC vial (rinsed × 3 with sample)
- **Bioburden sample:** 100 mL collected aseptically into a sterile bottle

8.3.2 Submit samples to QC with the sample form QC-FORM-CIP-001 and record sample reference in BPR Section 12.

8.3.3 **CIP Release Criteria:**

| Parameter | Method | Acceptance Criterion |
|---|---|---|
| Conductivity | Calibrated meter | ≤ 1.3 µS/cm |
| pH | Calibrated meter | 5.0–7.5 |
| TOC | USP <643> | ≤ 0.5 mg/L (500 ppb) |
| Bioburden | USP <61> | ≤ 10 CFU/100 mL |
| Visual Appearance | Visual inspection | No residue, discolouration, odour |

8.3.4 CIP is conditionally released for SIP based on conductivity and pH results (available same day). TOC and bioburden results (typically 5 days) are reviewed retrospectively. If TOC or bioburden fail out-of-specification, raise a critical deviation and investigate impact on any production run carried out under conditional release.

8.3.5 **[W – Witness Required]** SMA to verify final rinse samples are collected per this procedure and sign BPR Section 12.

8.3.6 CIP validity: the cleaned vessel must proceed to SIP within **7 days** of CIP completion. If SIP has not commenced within 7 days, repeat CIP before SIP.

---

### 8.4 Steam-In-Place (SIP)

#### 8.4.1 Pre-SIP Preparation

8.4.1.1 Confirm CIP has been completed and conditionally released per Section 8.3.

8.4.1.2 Reinstall all probes, ports, and lines required for the production run per SOP-UP-001, Section 8.3. Confirm assembly against AD-UP-001.

8.4.1.3 Install biological indicators (BI): place **two BI strips** at the identified worst-case locations within the vessel (validated worst-case positions per VAL-SIP-UP-001: bottom of vessel at liquid outlet, and inside the inoculation port). Record BI lot number and strip locations in BPR Section 13.

8.4.1.4 Install calibrated temperature sensor (Kaye Validator probe or RTD) at the coldest point within the vessel (validated per VAL-SIP-UP-001: bottom of vessel adjacent to BI strip). Record sensor ID and calibration due date in BPR Section 13.

8.4.1.5 **[W – Witness Required]** Engineering Technician to verify steam supply pressure (≥ 2.5 bar at the vessel steam inlet), steam trap operation (confirmed operational for each trap in the SIP circuit), and all drain valves are cracked open (to allow air displacement). Sign BPR Section 13.

#### 8.4.2 SIP Execution

8.4.2.1 Slowly open the main steam supply valve. Allow steam to enter the vessel and associated lines at a controlled rate to prevent water hammer.

8.4.2.2 Allow vessel temperature to rise to **121°C ± 2°C** as measured by the reference temperature sensor at the coldest point. This equilibration phase typically takes 30–60 minutes for a 500L vessel.

8.4.2.3 Once the reference temperature reaches **119°C**, start the SIP **hold time clock** in the BPR. Record start time.

8.4.2.4 Maintain steam hold for a minimum of **30 minutes** at ≥ 119°C (reference sensor) at 1.0 bar ± 0.2 bar vessel pressure.

8.4.2.5 Record reference temperature and vessel pressure at **5-minute intervals** throughout the hold period in BPR Section 13.

8.4.2.6 **SIP Acceptance Criteria:**

| Parameter | Requirement |
|---|---|
| Hold temperature (reference sensor) | ≥ 119°C for full 30-minute hold |
| Vessel pressure | 1.0 ± 0.2 bar |
| F₀ (calculated from temperature log) | ≥ 15 |
| Biological Indicator | No growth after 7-day incubation at 55°C |

8.4.2.7 If the reference temperature drops below 119°C during the hold phase, pause the hold timer. If temperature recovers within 5 minutes, resume timing from where paused. If temperature is below 119°C for more than 5 minutes, restart the full 30-minute hold once temperature recovers above 119°C. Record all interruptions in BPR Section 13.

#### 8.4.3 SIP Cooldown

8.4.3.1 Close the main steam supply valve. Allow vessel to cool passively under positive pressure.

8.4.3.2 Do not open any vessel port or fitting until vessel temperature is below **80°C** and vessel pressure has returned to ≤ 0.05 bar gauge (essentially atmospheric).

8.4.3.3 Once cool, maintain vessel under positive nitrogen pressure (0.05–0.1 bar) to prevent ingress of non-sterile air. This nitrogen overpressure must be maintained until media addition.

8.4.3.4 Record cooling end time and nitrogen overlay start time in BPR Section 13.

#### 8.4.4 Biological Indicator Retrieval and Incubation

8.4.4.1 Using aseptic technique and appropriate PPE, retrieve both BI strips from the vessel through the head plate access. Be careful – surfaces may still be hot.

8.4.4.2 Transfer BI strips into incubation vials and label: batch number, BI location, vessel ID, SIP date.

8.4.4.3 Submit to QC for incubation at **55°C ± 2°C for 7 days** per SOP-QC-022 (Biological Indicator Testing).

8.4.4.4 Record BI retrieval time and QC submission reference in BPR Section 13.

8.4.4.5 SIP is conditionally released based on temperature log data (F₀ ≥ 15, temperature ≥ 119°C for full hold). Final release requires negative BI results after 7-day incubation. If BI results are positive (growth observed), raise a critical deviation immediately. The batch produced in the vessel during the period of the failed SIP is subject to QA disposition.

---

### 8.5 SIP Validity

8.5.1 Following successful conditional release (temperature log), SIP validity period: **24 hours** from SIP completion.

8.5.2 If media addition has not commenced within 24 hours of SIP completion, re-SIP is required before use.

8.5.3 Record SIP completion time in BPR Section 13. Use this as the reference for the 24-hour validity window.

> **NOTE – SIP Validity for Staged Setup:** In some operational scenarios, bioreactor vessel SIP is performed in advance of inoculation planning, and operators have queried whether the 24-hour SIP validity applies from SIP completion or from media addition. This has caused confusion during night shifts. The intent of the 24-hour window is from SIP completion (i.e., when the vessel re-sealed under nitrogen). This note is included for clarity pending a formal update to this section (Change Control CC-UP-2024-003, raised February 2024).

---

## 9. IN-PROCESS CONTROLS

| Step | Parameter | Acceptance Criterion |
|---|---|---|
| Caustic Wash | Temperature (°C) | ≥ 65°C throughout 30-min hold |
| Caustic Wash | Duration (min) | ≥ 30 |
| Intermediate Rinse | Conductivity (µS/cm) | ≤ 50 (in-process check only) |
| Acid Wash | Temperature (°C) | ≥ 55°C throughout 20-min hold |
| Final Rinse | Conductivity (µS/cm) | ≤ 1.3 |
| Final Rinse | pH | 5.0–7.5 |
| Final Rinse | TOC (mg/L) | ≤ 0.5 (retrospective) |
| SIP Hold | Temperature (°C) | ≥ 119°C for ≥ 30 min |
| SIP Hold | Pressure (bar) | 1.0 ± 0.2 |
| SIP | F₀ | ≥ 15 |
| SIP | Biological Indicator | No growth at 7 days |

---

## 10. DEVIATIONS

10.1 Failure of any CIP or SIP acceptance criterion is a critical deviation requiring immediate QA notification.

10.2 Document all deviations on DEV-FORM-001 within 4 hours of occurrence.

10.3 No batch may be progressed to inoculation without QA sign-off on the CIP/SIP records, including written acknowledgement of any open deviations and their assessed impact.

---

## 11. REFERENCES

| Document | Title |
|---|---|
| SOP-UP-001 | Bioreactor Setup, Preparation and Inoculation |
| SOP-ENV-003 | Biowaste Deactivation Procedure |
| SOP-QC-022 | Biological Indicator Incubation and Reading |
| SOP-CL-002 | Preparation Vessel Cleaning Procedure |
| BPR-UP-001 | Upstream Perfusion Batch Production Record |
| VAL-CIP-UP-001 | CIP Cleaning Validation Report – Upstream Bioreactors |
| VAL-SIP-UP-001 | SIP Sterilisation Validation Report |
| ENG-UP-005 | Bioreactor CIP/SIP Circuit Engineering Drawing |
| QMS-DEV-001 | Deviation Classification and Management |
| GA-VAL-2023-004 | Validation Gap Assessment – CIP Vessel Size Applicability |

---

## 12. REVISION HISTORY

| Rev | Effective Date | Description of Change | Author | QA Approval |
|---|---|---|---|---|
| 00 | 2021-09-01 | Initial release | T. Brennan | C. O'Brien |
| 01 | 2022-11-14 | Added pre-CIP biological deactivation requirement (8.1.1). Updated SIP validity to 24 hours (8.5.1). Extended final rinse minimum from 15 to 20 minutes. | T. Brennan | C. O'Brien |
| 02 | 2023-07-20 | Updated CIP release criteria table (8.3.3). TOC limit reduced from 1.0 to 0.5 mg/L per VAL-CIP-UP-001 update. Added BI location diagram reference. | M. Gallagher | C. O'Brien |
| 03 | 2024-02-01 | Added NOTE at 8.2.2.3 re: CIP hold time validation gap (GA-VAL-2023-004). Added NOTE at 8.5.3 re: SIP validity interpretation. Added SIP pressure monitoring requirement. | T. Brennan | C. O'Brien |

---

*SOP-UP-005 Rev 03 | Classification: GMP Controlled | UNCONTROLLED WHEN PRINTED*
*Verify current revision in Document Management System before use*
