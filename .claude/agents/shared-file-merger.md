---
name: shared-file-merger
description: Merges 5 builder outputs into shared files (ids.js, admin.js, index.js, nav.js) with exact insertion points
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---

# Shared File Merger Agent

After 5 module-builder agents complete in parallel worktrees, you merge their changes into the shared files on the main branch. This is the most critical merge step.

## Project Root

The project is at `/Users/darrendoherty/Desktop/vent`.

## Context

Each builder modified these shared files in their worktree:
- `server/lib/ids.js` — added new ID generator functions
- `server/routes/admin.js` — added CREATE TABLE SQL
- `server/index.js` — added requires, service instantiation, PAGE_MAP entries, route mounts

You need to combine ALL 5 sets of changes into the main branch versions.

## Process

### Step 1: Collect Changes from All 5 Worktrees

For each worktree (`.claude/worktrees/round-N/<module>/`):
1. Read the new service file: `server/services/<module>.service.js`
2. Read the new route file: `server/routes/<module>.js`
3. Read the new frontend file: `docs/<dept>/<page>.html`
4. Diff the shared files to extract additions:
   - `git diff main -- server/lib/ids.js`
   - `git diff main -- server/routes/admin.js`
   - `git diff main -- server/index.js`

### Step 2: Copy Module Files to Main

For each of the 5 modules, copy the 3 new files:
```bash
cp .claude/worktrees/round-N/<module>/server/services/<module>.service.js server/services/
cp .claude/worktrees/round-N/<module>/server/routes/<module>.js server/routes/
cp .claude/worktrees/round-N/<module>/docs/<dept>/<page>.html docs/<dept>/
```

Create department directories if they don't exist (e.g., `mkdir -p docs/qc/`).

### Step 3: Merge into ids.js

**File:** `server/lib/ids.js`
**Insertion points:**
- New functions: BEFORE `module.exports = {` (currently last lines of file)
- New exports: ADD to the exports object

Pattern for each new function:
```javascript
/** PREFIX-1000 ... PREFIX-9999 */
function newId() {
  return 'PREFIX-' + Math.floor(1000 + Math.random() * 8999);
}
```

### Step 4: Merge into admin.js

**File:** `server/routes/admin.js`
**Insertion point:** BEFORE the closing backtick `.trim();` at the end of the SQL template literal

Use section headers:
```sql
-- ══ MODULE NAME ══════════════════════════════════════
```

### Step 5: Merge into index.js

**File:** `server/index.js`
**Six insertion points:**

1. **Route requires** (~line 41): `const <x>Routes = require('./routes/<module>');`
2. **Service requires** (~line 61): `const { make<X>Service } = require('./services/<module>.service');`
3. **PAGE_MAP** (~line 150): `'<slug>.html': '<dept>/<page>.html',`
4. **Service instantiation** (~line 217): `const <x>Service = make<X>Service({ supabase, auditLog, anthropic });`
5. **deps object** (~line 220-222): Add `<x>Service` to the deps spread
6. **Route mounting** (~line 242): `<x>Routes(app, deps);`

### Step 6: Update nav.js (if needed)

**File:** `docs/shared/nav.js`
Add new module page names to the appropriate role arrays in the `rules` object (lines 58-66).

### Step 7: Verify

- Run `node -c server/index.js` to syntax check
- Run `node -c server/lib/ids.js` to syntax check
- Verify no duplicate function names in ids.js
- Verify no duplicate table names in admin.js
- Verify no duplicate PAGE_MAP keys in index.js

## Critical Rules

- NEVER remove existing code — only ADD
- Maintain the exact whitespace/formatting of surrounding code
- If two builders modified the same shared file section, combine both changes
- The `deps` object in index.js must include ALL services (old + new)
- All 5 modules must be merged in a single pass — no partial merges
