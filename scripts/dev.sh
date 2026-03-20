#!/bin/bash
# ── DEV WORKFLOW COMMANDS ────────────────────────────────────────────────────
# Quick reference for all the tools in this project.
# Run any of these from the project root (/Users/darrendoherty/Desktop/vent)
# ─────────────────────────────────────────────────────────────────────────────

# ── STARTING THE APP ─────────────────────────────────────────────────────────

# Start the Express backend (API server on port 3001)
# You need this running for any API calls (login, database, AI, etc.)
npm run server

# Start the Vite frontend dev server (port 5173, auto-opens browser)
# This watches your files and hot-reloads changes instantly.
# API calls get forwarded to port 3001 automatically.
# Run this in a SECOND terminal while the server is running.
npm run dev

# ── CHECKING YOUR CODE ──────────────────────────────────────────────────────

# Lint — scans all JS files for bugs and mistakes (doesn't change anything)
# Shows warnings like: unused variables, undefined references, == instead of ===
npm run lint

# Lint + auto-fix — same as above but fixes what it can automatically
npm run lint:fix

# Format check — checks if code formatting is consistent (doesn't change anything)
# Fails if any file has inconsistent quotes, indentation, etc.
npm run format:check

# Format — rewrites all files with consistent formatting
# Single quotes, 2-space indent, trailing commas, semicolons
# Safe to run anytime — only changes whitespace and punctuation
npm run format

# ── BUILDING FOR PRODUCTION ─────────────────────────────────────────────────

# Build — minifies all CSS/JS for production deployment
# Creates optimised files in client/dist/
# Render runs this automatically on deploy
npm run build

# Preview — serves the production build locally so you can test it
# Run this AFTER npm run build to see what users will actually get
npm run preview

# ── RUNNING JUST ONE FILE THROUGH ESLINT ─────────────────────────────────────
# Useful when you want to check a specific file after editing it:
#   npx eslint client/operator/query/charlie.js
#   npx eslint server/routes/auth.js

# ── RUNNING JUST ONE FILE THROUGH PRETTIER ───────────────────────────────────
# Format a single file:
#   npx prettier --write client/operator/query/charlie.js
# Check without changing:
#   npx prettier --check client/operator/query/charlie.js
