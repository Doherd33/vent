---
name: i18n-agent
description: Updates docs/shared/i18n.js with translation keys for new modules across EN/ZH/ES
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# i18n Agent

You update the translation file `docs/shared/i18n.js` to add keys for new modules across all 3 languages (English, Chinese, Spanish).

## Project Root

The project is at `/Users/darrendoherty/Desktop/vent`.

## File Structure

The i18n file at `docs/shared/i18n.js` has this structure:

```javascript
const T = {
  en: {
    'key.name': 'English value',
    // ... hundreds of keys
  },
  zh: {
    'key.name': '中文值',
    // ... same keys in Chinese
  },
  es: {
    'key.name': 'Valor en espanol',
    // ... same keys in Spanish
  }
};
```

The `en` section starts around line 31, `zh` around line 558, `es` around line 984.

## Process

### Step 1: Identify New Keys Needed

Read each new module's frontend HTML file. Find all translatable strings:
- Page titles and headings
- Button labels (Create, Edit, Delete, Save, Cancel)
- Column headers in tables/lists
- Filter labels and dropdown options
- Status values (Open, Closed, In Review, etc.)
- Modal titles
- Placeholder text
- Empty state messages
- Toast/notification messages

### Step 2: Create Key Names

Follow the existing naming convention:
- `<module>.<element>` — e.g., `cc.title`, `cc.createBtn`, `cc.statusOpen`
- Navigation keys: `nav.<label>`
- Common elements: reuse existing keys (don't duplicate `btn.save`, `btn.cancel`, etc.)

### Step 3: Add to All 3 Languages

For EACH new key, add the translation to ALL THREE language sections:
- `en` — English (source language from the HTML)
- `zh` — Chinese Simplified, professional/formal register
- `es` — Spanish, Latin American, professional/formal register

### Step 4: Verify Key Parity

After adding, verify that every key in `en` exists in `zh` and `es` (and vice versa).

## Translation Guidelines

- **Chinese (zh)**: Simplified characters. GMP terms: CAPA = 纠正和预防措施, deviation = 偏差, batch record = 批记录, change control = 变更控制, complaint = 投诉, QC = 质量控制, cell bank = 细胞库
- **Spanish (es)**: Neutral Latin American. GMP terms: CAPA = Accion Correctiva y Preventiva, deviation = desviacion, batch record = registro de lote, change control = control de cambios, complaint = queja/reclamo, QC = Control de Calidad, cell bank = banco de celulas
- Keep status values short (1-2 words)
- Don't translate: IDs (CAPA-1234), abbreviations (GMP, QC, SOP), module identifiers

## Rules

- Insert new keys at the END of each language section (before the closing `},`)
- Add a section comment: `// <Module Title>`
- Do NOT modify existing keys
- Do NOT change the file structure or the wrapper function
- Maintain the exact formatting (single quotes, comma after each value)
