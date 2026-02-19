# STANDARD OPERATING PROCEDURE

| Field | Detail |
|---|---|
| **Document Number** | SOP-UP-004 |
| **Title** | Harvest Line, ATF System Setup and Perfusion Cell Retention Operation |
| **Revision** | 02 |
| **Effective Date** | 2023-11-01 |
| **Review Date** | 2024-11-01 |
| **Department** | Upstream Processing |
| **Author** | M. Gallagher – Senior Process Engineer |
| **Reviewed By** | R. Connolly – Process Scientist |
| **Approved By** | C. O'Brien – QA Manager |
| **Classification** | GMP Controlled Document |

> **UNCONTROLLED WHEN PRINTED** – Always verify currency against the Document Management System before use.

---

## 1. PURPOSE

This SOP describes the setup, integrity testing, operation, and shutdown of the Alternating Tangential Flow (ATF) perfusion system used for cell retention during continuous upstream biologics manufacturing. It covers hollow fibre membrane preparation, system connections, transmembrane pressure (TMP) monitoring, permeate harvest collection, and end-of-run procedures.

---

## 2. SCOPE

This procedure applies to Manufacturing Associates (MA) and Senior Manufacturing Associates (SMA) involved in the installation, operation, and shutdown of ATF-based cell retention systems in the Upstream Processing suite. This SOP covers ATF2, ATF6, and ATF10 systems (Repligen Corporation) installed on 50L, 200L, and 500L bioreactors respectively.

This SOP does not cover downstream processing of the harvest permeate (refer to downstream SOP set DSP-001 series).

---

## 3. REGULATORY REFERENCES

- 21 CFR Part 211 – Current Good Manufacturing Practice
- EU GMP Annex 1 – Manufacture of Sterile Medicinal Products
- ICH Q10 – Pharmaceutical Quality System
- Internal: QMS-GEN-001 – Document Control
- Repligen ATF System User Manual (ATF-UM-2022 Rev C)

---

## 4. DEFINITIONS

| Term | Definition |
|---|---|
| ATF | Alternating Tangential Flow – a cell retention technology using bidirectional flow through a hollow fibre filter driven by a diaphragm pump |
| TFF | Tangential Flow Filtration – the general principle of cross-flow filtration used in ATF |
| Hollow Fibre (HF) | The filtration membrane used in ATF systems; cells are retained on the shell side while permeate passes through the lumen |
| TMP | Transmembrane Pressure – the pressure difference across the hollow fibre membrane (shell side minus lumen side); critical process parameter |
| Permeate | The cell-free filtrate that passes through the hollow fibre membrane; also called the harvest stream in perfusion |
| Retentate | Culture fluid returned to the bioreactor after passage through the ATF (contains cells) |
| Diaphragm Pump | The pump in the ATF system that drives alternating flow through the hollow fibre |
| MWCO | Molecular Weight Cut-Off – the molecular size threshold of the hollow fibre membrane (typically 0.2µm for cell retention) |
| NWP | Normalised Water Permeability – measure of hollow fibre membrane performance |
| WIT | Water Integrity Test – pre-use test to confirm hollow fibre membrane integrity |

---

## 5. RESPONSIBILITIES

| Role | Responsibility |
|---|---|
| Manufacturing Associate (MA) | Assemble ATF system, perform integrity tests, connect to bioreactor, monitor TMP during operation, document in BPR |
| Senior Manufacturing Associate (SMA) | Witness critical connections and integrity tests, verify ATF assembly, countersign BPR |
| Process Scientist (PS) | Set ATF operating parameters, review daily TMP trends, advise on membrane replacement, investigate deviations |
| QA Representative | Review BPR, approve deviations, confirm membrane lot traceability |
| Engineering | Maintain ATF controller, calibrate pressure transducers, perform preventive maintenance |

---

## 6. SAFETY PRECAUTIONS

6.1 Standard Upstream Processing PPE applies: cleanroom gown, double gloves, safety glasses.

6.2 The ATF diaphragm pump operates at pressure. Confirm that all fittings are secure and rated for ≥ 3 bar before pressurising the system. Never exceed system pressure ratings.

6.3 When performing WIT with pressurised WFI, stand clear of fittings during pressurisation. Release pressure slowly using the manual bleed valve.

6.4 Hollow fibre membranes are stored in 20% ethanol. Flush completely with WFI before bioprocess use. Incomplete flushing will cause cell toxicity and potential run failure.

6.5 All harvest permeate is biological material (BSL-1). Handle in accordance with BSP-001.

---

## 7. EQUIPMENT AND MATERIALS

### 7.1 Equipment

- Repligen ATF2 (50L bioreactor), ATF6 (200L), or ATF10 (500L) system as applicable
- ATF Controller (XCell ATF Controller, Repligen) – calibrated, with current service record
- Pressure transducers: retentate side (P1) and permeate side (P2) – calibrated with certificate in BPR
- Peristaltic pump for permeate collection (calibrated)
- Diaphragm pump integral to ATF system (maintained per PM schedule)
- Class II BSC for aseptic connections (where applicable)
- Calibrated pressure gauge for WIT

### 7.2 Consumables

- Repligen XCell ATF hollow fibre filter (product code and MWCO per PS-[PRODUCT CODE]-UP-001; lot number on BPR)
- Silicone tubing sets (single-use, bioprocess grade, per ATF assembly drawing AD-UP-004)
- Sterile connectors (Kleenpak or equivalent)
- WFI for membrane flush and WIT
- 20% ethanol in WFI (for membrane storage, not bioprocess use)
- Single-use harvest collection bags (appropriate size for collection interval)
- Sterile sampling syringes, 10 mL

---

## 8. PROCEDURE

### 8.1 ATF System Pre-Assembly and Membrane Preparation

#### 8.1.1 Equipment Verification

8.1.1.1 Confirm that the ATF controller has a current calibration certificate and that the pressure transducers (P1 and P2) are calibrated and within due date. Record in BPR-UP-001, Section 10.

8.1.1.2 Confirm that the hollow fibre membrane to be used has not been used previously (single-use component unless a multi-use membrane is specified in PS-[PRODUCT CODE]-UP-001 and qualified by validation study). Record the membrane lot number, MWCO, surface area, and expiry date in BPR Section 10.

8.1.1.3 Inspect the hollow fibre cartridge for visible damage to the housing, end caps, or fittings. Do not use a damaged membrane. Record inspection pass/fail in BPR Section 10.

#### 8.1.2 Membrane Flushing

8.1.2.1 Hollow fibre membranes are supplied stored in **20% ethanol**. Before use, the ethanol must be completely flushed out using WFI.

8.1.2.2 Connect the hollow fibre to a WFI supply line (lumen-side inlet). Pass WFI through the lumen at a flow rate of approximately **200 mL/min** for the ATF6 (scale appropriately for ATF2 and ATF10).

8.1.2.3 Collect all flush effluent from the lumen outlet and shell-side (permeate) port.

8.1.2.4 Flush for a minimum of **10 minutes or 5 lumen volumes**, whichever is greater. Record volume flushed in BPR Section 10.

8.1.2.5 Confirm ethanol removal by conductivity or odour check of the final flush effluent. Target conductivity of final flush ≤ 2.0 µS/cm (same as WFI specification). Record result in BPR Section 10.

> **NOTE – Ethanol Flush Duration Gap:** The current procedure specifies 10 minutes or 5 lumen volumes but does not specify what to do if conductivity remains > 2.0 µS/cm after this time. In practice, operators have continued flushing for up to 30 minutes in this situation. A formal maximum flush time or alternate acceptance criterion is not defined. This ambiguity has been reported by floor operators on multiple occasions (observations VNT-1042, VNT-1076, VNT-1091). Recommend formal specification of extended flush procedure in the next revision (Change Control CC-UP-2024-022, raised but not yet approved).

---

### 8.2 Water Integrity Test (WIT)

8.2.1 **Purpose:** The WIT (also known as a water flux test or bubble point test) confirms that the hollow fibre membrane is structurally intact and free from defects that would allow cell passage into the permeate (harvest) stream.

8.2.2 **Method – Bubble Point Test**

8.2.2.1 After flushing, close all lumen-side and shell-side outlets except the lumen-side inlet.

8.2.2.2 Apply pressurised nitrogen to the shell (outside) of the hollow fibre at **0.5 bar**. Hold for 5 minutes.

8.2.2.3 Submerge the lumen outlet in a water-filled container (or connect to a downstream pressure gauge). Observe for continuous bubble stream from the lumen side.

8.2.2.4 **Acceptance Criterion:** No continuous bubble stream observed at 0.5 bar on shell side. A few isolated bubbles at connection points are acceptable.

8.2.2.5 Record test result (Pass/Fail), applied pressure, and test duration in BPR Section 10.

8.2.2.6 If the WIT fails, **do not use this membrane.** Remove and discard. Install a new hollow fibre from the same or different lot. Repeat WIT. If two consecutive membranes from the same lot fail, quarantine the lot and notify QA. Raise a deviation on DEV-FORM-001.

> **NOTE – WIT Pressure for Different Membrane Sizes:** The current SOP specifies a single WIT pressure of 0.5 bar for all ATF sizes (ATF2, ATF6, ATF10). However, the manufacturer's technical data sheets specify different bubble point pressures for different membrane MWCOs and surface areas. The 0.5 bar value was validated for the ATF6 with 0.2µm MWCO membrane only. Use on ATF2 and ATF10 configurations has not been formally revalidated. This gap has been identified by the validation team (Validation Concern VC-UP-2023-008, open). Until resolved, the 0.5 bar value will be applied across all sizes per PS instruction, with a deviation raised if a result is ambiguous.

---

### 8.3 ATF System Assembly and Connection to Bioreactor

8.3.1 Assemble the ATF system per assembly drawing AD-UP-004, including:
- Diaphragm pump connections
- Hollow fibre membrane (lumen and shell ports)
- Retentate return line to bioreactor (Port 5, lower ring)
- Permeate outlet line to harvest collection bag

8.3.2 **[W – Witness Required]** SMA to verify all ATF assembly connections against AD-UP-004. Record verification and SMA signature in BPR Section 10.

8.3.3 Connect the ATF retentate return line to bioreactor Port 5 using aseptic technique per SOP-ASP-001. Use a validated single-use sterile connector.

8.3.4 Connect the permeate outlet line to a sterile single-use harvest collection bag.

8.3.5 **[W – Witness Required]** SMA to witness all bioreactor connections. Record in BPR Section 10.

8.3.6 Perform a final pressure hold test on the fully assembled ATF circuit: pressurise to **0.3 bar** with nitrogen for **5 minutes**. Acceptance criterion: pressure drop ≤ 0.01 bar. Record in BPR Section 10.

---

### 8.4 ATF System Start-Up

8.4.1 Start the ATF diaphragm pump at the initial set stroke rate specified in PS-[PRODUCT CODE]-UP-001 (typically **40–60 strokes/min** for ATF6).

8.4.2 Confirm bidirectional flow through the hollow fibre by observing the pressure trace on the ATF controller: P1 (retentate) should oscillate in phase with the diaphragm cycle.

8.4.3 Record ATF start time in BPR Section 10. ATF start time is typically coincident with or shortly after perfusion initiation (refer to SOP-UP-002, Section 8.6).

8.4.4 Monitor TMP continuously via the ATF controller display. Initial TMP should be within the range specified in PS-[PRODUCT CODE]-UP-001 (typically **≤ 0.2 bar** at start of run).

8.4.5 Record initial TMP (P1 – P2) in BPR Section 10.

---

### 8.5 Ongoing ATF Operation and TMP Monitoring

8.5.1 Record TMP values in BPR Section 10 at the following frequency:
- During ramp-up (Days 1–5): every 4 hours
- During steady state: once daily, or at each shift change if 24-hour monitoring is in place
- Any time an alert or alarm is active: continuously until resolved

8.5.2 **TMP Alert and Action Limits:**

| TMP (bar) | Status | Action |
|---|---|---|
| ≤ 0.2 | Normal | Continue operation |
| 0.2–0.4 | Alert | Notify Process Scientist. Increase ATF stroke rate. Review perfusion flow rate. |
| > 0.4 | Action | Notify PS and QA. Consider membrane flush or replacement. Raise deviation. |
| < 0 (negative) | Alarm | ATF pump may be stalled or disconnected. Check system. Notify PS immediately. |

> **NOTE – TMP Limits for Different Membrane Ages and Sizes:** The TMP limits above (0.2 bar alert, 0.4 bar action) were defined based on ATF6 performance data from the process development study PD-UP-2021-003. No equivalent study has been completed for ATF2 or ATF10 configurations, and no correction factor for membrane age (days in service for multi-use membranes) is defined. Operators have asked on multiple occasions what the expected TMP trajectory is over a typical 30-day run and at what rate of TMP rise a membrane should be replaced pre-emptively. This information is not currently documented. (Change Control CC-UP-2023-055, open since September 2023.)

8.5.3 If TMP cannot be reduced below 0.4 bar by increasing ATF stroke rate, notify the Process Scientist to evaluate a membrane flush or replacement.

---

### 8.6 Membrane Flush During Operation (If Required)

8.6.1 An in-situ membrane flush may be performed without stopping the culture if approved by the Process Scientist.

8.6.2 Reduce perfusion flow to zero (pause perfusion pump).

8.6.3 Flush the hollow fibre lumen with **sterile WFI** at a flow rate of 200 mL/min for 5 minutes.

8.6.4 Collect all flush effluent from the permeate line to waste (do not add to harvest). Discard per SOP-ENV-003.

8.6.5 Resume perfusion after flush. Monitor TMP. If TMP does not decrease below the alert limit within 2 hours of resuming, consider membrane replacement.

8.6.6 Record all flush events (time, volume, post-flush TMP) in BPR Section 10. Raise a deviation if flush was required.

---

### 8.7 Harvest Collection and Changeover

8.7.1 Harvest permeate accumulates continuously in the harvest collection bag. Monitor bag volume daily and record in BPR Section 11.

8.7.2 Change the harvest collection bag when:
- Bag reaches 90% of maximum volume, OR
- Daily as per PS instruction for in-process QC sampling

8.7.3 To change the harvest bag:
8.7.3.1 Clamp the permeate outlet line upstream of the current bag.
8.7.3.2 Connect a new sterile bag to the permeate line using aseptic technique per SOP-ASP-001.
8.7.3.3 Release the clamp. Record changeover time and new bag label in BPR Section 11.
8.7.3.4 Seal and weigh the completed harvest bag. Record weight in BPR Section 11.
8.7.3.5 Label the completed harvest bag: batch number, harvest day, bag sequence number, volume, time of collection.
8.7.3.6 Transfer to harvest hold at 2–8°C per DSP transfer procedure DSP-001.

8.7.4 **[W – Witness Required]** SMA to witness all permeate bag connections and completed bag labelling. Record in BPR Section 11.

---

### 8.8 End-of-Run ATF Shutdown

8.8.1 Stop the perfusion pump (SOP-UP-002). Stop the bleed pump (SOP-UP-003).

8.8.2 Stop the ATF diaphragm pump. Record stop time in BPR Section 10.

8.8.3 Clamp and disconnect the ATF retentate return line from the bioreactor using aseptic technique.

8.8.4 Disconnect the permeate outlet line. Collect and label final harvest bag.

8.8.5 Flush the hollow fibre with WFI (3 lumen volumes) to remove residual biological material before discard.

8.8.6 Discard hollow fibre membrane (single-use) per SOP-ENV-003. If multi-use membrane, store in 20% ethanol per manufacturer guidance and record storage in membrane use log MUL-ATF-001.

8.8.7 Record ATF total run duration and final TMP reading at shutdown in BPR Section 10.

---

## 9. IN-PROCESS CONTROLS

| Parameter | Target / Limit | Alert | Action |
|---|---|---|---|
| TMP (bar) | ≤ 0.2 | 0.2–0.4 | > 0.4 → deviation + PS/QA |
| ATF stroke rate (strokes/min) | Per PS-[PRODUCT CODE]-UP-001 | ± 10 from setpoint | ± 20 → investigate |
| Permeate flow rate (mL/hr) | Matching perfusion rate | ± 10% of target | ± 20% → investigate ATF performance |
| Harvest bag volume | ≤ 90% capacity at changeover | Approaching 90% | > 90% → immediate changeover |

---

## 10. DEVIATIONS

10.1 WIT failure, TMP > 0.4 bar, permeate bag overfill, or any loss of ATF system integrity constitutes a critical deviation requiring immediate QA notification.

10.2 Document all deviations on DEV-FORM-001 within 4 hours of occurrence.

---

## 11. REFERENCES

| Document | Title |
|---|---|
| SOP-UP-001 | Bioreactor Setup, Preparation and Inoculation |
| SOP-UP-002 | Perfusion Media Preparation and Exchange |
| SOP-UP-003 | Cell Density and Viability Monitoring |
| SOP-UP-005 | Bioreactor CIP/SIP Procedure |
| SOP-ASP-001 | Aseptic Technique and Connection Procedure |
| SOP-ENV-003 | Biowaste Deactivation Procedure |
| BPR-UP-001 | Upstream Perfusion Batch Production Record |
| AD-UP-004 | ATF System Assembly Drawing |
| PS-[PRODUCT CODE]-UP-001 | Process Specification – Upstream Parameters |
| Repligen ATF-UM-2022 Rev C | XCell ATF System User Manual |
| FQ-UP-002 | Hollow Fibre Filter Qualification Report |
| DSP-001 | Harvest Transfer and Hold Procedure |

---

## 12. REVISION HISTORY

| Rev | Effective Date | Description of Change | Author | QA Approval |
|---|---|---|---|---|
| 00 | 2022-06-01 | Initial release | M. Gallagher | C. O'Brien |
| 01 | 2023-03-10 | Added post-assembly pressure hold test (8.3.6). Expanded TMP alert/action table. Added end-of-run section (8.8). | M. Gallagher | C. O'Brien |
| 02 | 2023-11-01 | Added NOTEs re: ethanol flush gap (8.1.2.5), WIT pressure validation gap (8.2.2.6), TMP limits gap (8.5.2). Added membrane flush procedure (8.6). | M. Gallagher | C. O'Brien |

---

*SOP-UP-004 Rev 02 | Classification: GMP Controlled | UNCONTROLLED WHEN PRINTED*
*Verify current revision in Document Management System before use*
