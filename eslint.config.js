// ── ESLint Configuration ────────────────────────────────────────────────────
// Flat config format (ESLint v9+). Catches bugs without being annoying.
// Rules are intentionally relaxed for the existing codebase — we want
// ESLint to catch real problems, not yell about every legacy pattern.
// ────────────────────────────────────────────────────────────────────────────
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  // Start with ESLint's recommended rules (catches real bugs)
  js.configs.recommended,

  // Turn off rules that conflict with Prettier (formatting is Prettier's job)
  prettier,

  // Our project-specific overrides
  {
    // Only lint JS files in client/ and server/
    files: ['client/**/*.js', 'server/**/*.js'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script', // most files use var/function, not import/export yet
      globals: {
        // Browser globals (for client/ files)
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        MediaRecorder: 'readonly',
        AudioContext: 'readonly',
        Image: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        speechSynthesis: 'readonly',
        SpeechSynthesisUtterance: 'readonly',

        // Node.js globals (for server/ files)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',

        // Vent app globals (set by nav.js and other shared scripts)
        SERVER: 'readonly',
        authFetch: 'readonly',
        getAuthHeaders: 'readonly',
        VentI18n: 'readonly',
        VentAudio: 'readonly',
      },
    },

    rules: {
      // ── Catch real bugs ──────────────────────────────────────────────
      'no-undef': 'warn',              // using a variable that doesn't exist
      'no-unused-vars': ['warn', {      // declared but never used
        argsIgnorePattern: '^_',        // allow _unused params (convention)
        varsIgnorePattern: '^_',
      }],
      'no-constant-condition': 'warn',  // if(true) — probably a mistake
      'no-dupe-keys': 'error',          // { a: 1, a: 2 } — always a bug
      'no-duplicate-case': 'error',     // switch with two identical cases
      'no-unreachable': 'warn',         // code after return/throw

      // ── Prevent common mistakes ──────────────────────────────────────
      'eqeqeq': ['warn', 'smart'],     // use === instead of == (except for null checks)
      'no-eval': 'error',              // eval() is a security hole
      'no-implied-eval': 'error',      // setTimeout("code") is also eval

      // ── Relax rules for existing codebase ────────────────────────────
      'no-var': 'off',                 // we use var everywhere, that's fine for now
      'prefer-const': 'off',           // same — not enforcing const yet
      'no-prototype-builtins': 'off',  // obj.hasOwnProperty() is fine
      'no-empty': 'off',              // empty catch blocks are common in our code
    },
  },
];
