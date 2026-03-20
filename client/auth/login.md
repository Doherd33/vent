# Login — Unit Operation

The login page is the first thing a user sees when they open Vent. Its job is simple: verify who you are and send you to the right place. Five files work together to make this happen.

---

## The 5 Files

| File | Role | Lives in |
|------|------|----------|
| [login.html](login.html) | Structure — the HTML skeleton | `client/auth/` |
| [login.css](login.css) | Appearance — styling for the login page only | `client/auth/` |
| [login-auth.js](../shared/login-auth.js) | Behaviour — button clicks, form logic, API calls | `client/shared/` |
| [routes/auth.js](../../server/routes/auth.js) | Backend route — catches `/auth/login` and `/auth/me` requests | `server/routes/` |
| [lib/auth.js](../../server/lib/auth.js) | Backend utility — password hashing, JWT creation, `requireAuth` middleware | `server/lib/` |

Plus two supporting pieces:
- **styles.css** (`client/shared/`) — global CSS shared across every page in Vent (fonts, colours, resets). Not login-specific.
- **Supabase** — the external database where user accounts are stored (email, password hash, role, etc.)

---

## How They Wire Together

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (what the user sees)                           │
│                                                         │
│  login.html                                             │
│    ├── loads styles.css (global look & feel)             │
│    ├── loads login.css (login-specific styling)          │
│    └── loads login-auth.js (all the behaviour)           │
│                                                         │
│  login-auth.js                                          │
│    ├── On page load: checks localStorage for token      │
│    │   ├── No token? → show login form                  │
│    │   └── Real token? → calls GET /auth/me to verify   │
│    │       ├── Valid → redirect to hub (skip login)     │
│    │       └── Invalid → clear localStorage, show form  │
│    │                                                    │
│    └── "Sign in" button: doLogin()                      │
│        └── POST /auth/login with { email, password }    │
│            ├── Success → save token + user to           │
│            │   localStorage → redirect to hub           │
│            └── Failure → show error message             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP requests
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SERVER (Express, running from index.js)                │
│                                                         │
│  index.js (startup only)                                │
│    └── Wires up: authRoutes(app, { supabase, auth })    │
│        After this, index.js steps back.                 │
│                                                         │
│  routes/auth.js (handles the requests)                  │
│    ├── POST /auth/login                                 │
│    │   1. Reads email + password from request body      │
│    │   2. Looks up user in Supabase by email            │
│    │   3. Calls lib/auth.js → verifyPassword()          │
│    │   4. If valid: calls lib/auth.js → createToken()   │
│    │   5. Writes an audit log entry                     │
│    │   6. Sends back { token, user } to the browser     │
│    │                                                    │
│    └── GET /auth/me                                     │
│        1. requireAuth middleware (from lib/auth.js)      │
│           decodes JWT from Authorization header          │
│        2. If valid: sends back { user } info            │
│        3. If invalid: sends 401 Unauthorized            │
│                                                         │
│  lib/auth.js (utility functions, used by routes)        │
│    ├── hashPassword(password) → { hash, salt }          │
│    │   Used during registration to store passwords      │
│    │   safely (never store raw passwords)               │
│    ├── verifyPassword(password, hash, salt) → boolean   │
│    │   Used during login to check the password          │
│    ├── createToken(user) → JWT string                   │
│    │   Creates the signed token sent back to browser    │
│    └── requireAuth (middleware)                          │
│        Runs before protected routes, decodes the JWT    │
│        and attaches user info to the request             │
└──────────────────────┬──────────────────────────────────┘
                       │ Database queries
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SUPABASE (external database)                           │
│                                                         │
│  users table                                            │
│    ├── id            (unique identifier)                │
│    ├── email         (login credential)                 │
│    ├── password_hash (scrambled password)               │
│    ├── password_salt (random value used in scrambling)  │
│    ├── name          (display name)                     │
│    └── role          (operator / qa / admin / etc.)     │
│                                                         │
│  The role determines what the user sees in the hub.     │
│  Everyone lands on /hub/hub.html — the hub adapts       │
│  based on the role stored in localStorage.              │
└─────────────────────────────────────────────────────────┘
```

---

## The Login Flow

### Sign In (the only login path)
1. User types email + password → clicks "Sign in"
2. `login-auth.js` → `doLogin()` → sends POST to `/auth/login`
3. `routes/auth.js` → looks up user in Supabase → verifies password via `lib/auth.js`
4. Server sends back `{ token, user: { id, email, name, role } }`
5. `login-auth.js` → `handleAuthSuccess()` → saves to localStorage → redirects to hub

### Auto-Redirect (returning user)
1. Page loads → IIFE `checkExisting()` runs immediately
2. Checks localStorage for `vent_token`
3. No token → show the login form
4. Has token → calls GET `/auth/me` to verify it's still valid
5. Valid → redirect to hub (user never sees the login form)
6. Invalid/expired → clear localStorage, show the login form

---

## Key Concepts

**localStorage** — the browser's notepad. Survives refreshes and restarts. Each domain has its own. This is where the logged-in state lives:
- `vent_token` — JWT (proof of identity)
- `vent_role` — what the user should see
- `vent_name` — display name
- `vent_user_id` — unique identifier

**JWT (JSON Web Token)** — a signed string the server creates at login. Contains user info, signed with a secret key. The frontend carries it and sends it with every request. The server can verify it without looking anything up in the database — the signature proves it's legitimate. Tokens expire after 24 hours (set in `lib/auth.js`).

**Password hashing** — passwords are never stored as plain text. `lib/auth.js` scrambles them with a random salt before storing. When you log in, it scrambles what you typed with the same salt and checks if the result matches. Even if the database is breached, attackers get scrambled hashes, not passwords.

**Audit logging** — every login is recorded. `routes/auth.js` writes an entry saying who logged in, when, and from where. This is important for a regulated environment like pharma/GxP — you need to prove who accessed the system.

---

## Shared Files (not login-specific, but used here)

- **nav.js** (`client/shared/`) — auth guard that runs on every page *after* login. Checks the token is still valid and redirects to login if not. The login page itself does NOT load nav.js — it only kicks in once you're inside the app.
- **styles.css** (`client/shared/`) — global base styles (fonts, colours, resets) shared by every page.
