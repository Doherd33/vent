---
name: progress-updater
description: Updates dev-progress.js module status, dev.html kanban board, and project.html registry after a build round
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Progress Updater Agent

After a build round completes, you update all tracking files to reflect the new module statuses.

## Project Root

The project is at `/Users/darrendoherty/Desktop/vent`.

## Files to Update

### 1. `docs/shared/dev-progress.js`

The modules array (starting around line 9) needs new entries for each newly-built module:

```javascript
{ id:'<module-id>', title:'<Title>', path:'/<slug>.html', status:'live' },
```

Also update the comment with the new live count (e.g., "Live (28)" if going from 23 to 28).

### 2. `docs/dev.html`

The modules array needs:
- Change `status:'planned'` to `status:'live'` for each newly-built module
- Add `path:'/slug.html'` if it was null
- Keep all other fields unchanged

### 3. `docs/project.html`

The MODULES array (starting around line 334) needs:
- Add `builtRound: N` to each newly-built module's object
- Change `status: 'planned'` to `status: 'live'`
- Add `path: '/<slug>.html'`

## Process

1. Read the spec files to know which modules were built and their details
2. Read each target file to find exact insertion/modification points
3. Make minimal, surgical edits — only change status, path, and builtRound
4. Verify counts are consistent across all 3 files

## Verification

After updating:
- Count of `status:'live'` in dev-progress.js = dev.html = project.html
- No `status:'wip'` entries remain from this round
- The `totalModules` stays at 76
- Comment headers updated with new live count

## Important

- Do NOT change any planned module's data (only the ones just built)
- Do NOT change module IDs, descriptions, dependencies, or other metadata
- Only change: status, path, builtRound
