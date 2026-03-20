// ════════════════════════════════════════════════════════════════════════════
// login-auth.js — THE LOGIN BRAIN (all auth logic for the login page)
// ════════════════════════════════════════════════════════════════════════════
//
// This file is loaded by login.html via a <script> tag. It handles:
//   1. Checking if you're ALREADY logged in (auto-redirect)
//   2. The "Sign in" button (real login via the backend)
//   3. UI helpers (show/hide password, loading spinners, error messages)
//
// It does NOT contain any HTML — it manipulates the HTML that login.html
// already has on the page, using document.getElementById() to find elements.
//
// THE KEY CONCEPT — localStorage:
//   localStorage is the browser's built-in notepad. It stores key=value pairs
//   that SURVIVE page refreshes and browser restarts. It's per-domain, so
//   localhost:3000's localStorage is separate from google.com's.
//
//   We use it to remember WHO is logged in:
//     vent_token   = the JWT (proof of identity, like a wristband at a venue)
//     vent_role    = operator / qa / admin / etc.
//     vent_name    = display name
//     vent_user_id = unique ID
//
//   Every other page in Vent checks localStorage for these values.
//   If vent_token is missing → redirect back to login.
//   If vent_token is present → you're in.
//
// WHAT'S A JWT (JSON Web Token)?
//   It's a long encoded string that the SERVER creates when you log in.
//   It contains your user info (id, name, role) and is SIGNED with a
//   secret key that only the server knows. So:
//     - The frontend can READ it (to know who you are)
//     - But can't FORGE it (because it doesn't know the secret)
//     - The server can VERIFY it on every request ("yes, I made this token,
//       and it says you're user X with role Y")
//   Think of it like a wristband at a festival — the venue puts it on you
//   at the gate, and every bar/stage just checks for the wristband.
//
// DEPENDENCIES:
//   None — this file is self-contained. login.html loads it via:
//     <script src="/shared/login-auth.js"></script>
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// SERVER — where to send API requests
// ════════════════════════════════════════════════════════════════════════════
const SERVER = window.location.origin;
//
// ↑ Broken down:
//
// const SERVER
// └─ A permanent variable. ALL CAPS = configuration constant (by convention).
//    We'll use this in every fetch() call below so we don't have to
//    hard-code the server address everywhere.
//
// window.location.origin
// │      │         └─ .origin = the protocol + domain + port of the current page.
// │      │            If you're on http://localhost:3000/auth/login.html
// │      │            then origin = "http://localhost:3000"
// │      │            It strips off everything after the port — no path, no query string.
// │      └─ .location = an object the browser gives you with info about the current URL.
// └─ window = the top-level browser object. Everything in the browser lives under window.
//
// WHY USE THIS INSTEAD OF HARD-CODING "http://localhost:3000"?
//   Because the server address changes depending on where you deploy:
//     - Development: http://localhost:3000
//     - Production:  https://vent.onrender.com (or wherever)
//   By using window.location.origin, the code automatically uses whatever
//   domain the page is being served from. Zero config changes needed.
//
// SO WHEN WE LATER DO:
//   fetch(SERVER + '/auth/login', ...)
// IT BECOMES:
//   fetch('http://localhost:3000/auth/login', ...)   ← in development
//   fetch('https://vent.onrender.com/auth/login', ...) ← in production


// ════════════════════════════════════════════════════════════════════════════
// AUTO-REDIRECT — check if the user is already logged in
// ════════════════════════════════════════════════════════════════════════════
//
// This runs IMMEDIATELY when the page loads. Before the user even sees the
// login form, this code checks: "do you already have a valid token?"
// If yes → skip the login page, go straight to the hub.
// If no  → do nothing, let them see the login form.
//
// WHY? Because it's annoying to see a login page every time you refresh
// the browser when you're already logged in. This is a quality-of-life feature.

(async function checkExisting() {
  // ↑ This is an IIFE — Immediately Invoked Function Expression.
  //   Let's break that down because it looks weird:
  //
  //   (async function checkExisting() { ... })();
  //    │                                      └─ () at the end = "run this NOW"
  //    │                                         Same as express() — the () means "go"
  //    └─ The whole function is wrapped in ( ) to make it an expression.
  //       Without the outer ( ), JavaScript would see "function" at the start
  //       of the line and think it's a function DECLARATION (save it for later).
  //       With the ( ), it becomes an expression (evaluate it now).
  //
  //   async = this function can use "await" (pause while waiting for the server).
  //
  //   checkExisting = the name. It's optional for IIFEs — it's just for
  //   readability and stack traces. You could write (async function() { ... })()
  //   and it would work the same.
  //
  //   THE EFFECT: This function runs once, immediately, when the script loads.
  //   It checks your token, redirects if valid, and then it's done. It never
  //   runs again — it's a one-shot "on page load" check.

  const token = localStorage.getItem('vent_token');
  // ↑ Reach into localStorage and look for a key called 'vent_token'.
  //   If you logged in before, this will be a JWT string like "eyJhbGci..."
  //   If you've never logged in (or cleared your data), this will be null.
  //
  //   localStorage.getItem(key) = "give me the value stored under this key"
  //   localStorage.setItem(key, value) = "save this value under this key"
  //   localStorage.removeItem(key) = "delete this key"

  if (!token) return;
  // ↑ If there's no token, stop here. The user hasn't logged in before
  //   (or their token was cleared). Let them see the login form.
  //   "return" inside a function means "stop running this function NOW."
  //   ! = "not" — so !token means "if token is null/undefined/empty"

  try {
    // ↑ try/catch = "try this code, and if anything goes wrong, jump to catch."
    //   We need this because fetch() can fail if the server is down.

    const res = await fetch(SERVER + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    // ↑ THIS IS THE BACKEND CALL. Let's trace exactly what happens:
    //
    // fetch(url, options)
    // └─ The browser's built-in function for making HTTP requests.
    //    Like a mini invisible browser — it visits a URL and brings back
    //    the response, all in JavaScript without leaving the page.
    //
    // SERVER + '/auth/me'
    // └─ String concatenation. SERVER is "http://localhost:3000"
    //    so this becomes "http://localhost:3000/auth/me"
    //    This is a GET request (the default when you don't specify method).
    //
    // { headers: { 'Authorization': 'Bearer ' + token } }
    // └─ HTTP headers are metadata sent WITH the request.
    //    'Authorization' is a standard header that says "here's my proof
    //    of identity." The format 'Bearer [token]' is a convention —
    //    "Bearer" means "I'm bearing (carrying) this token."
    //    The server will read this header, decode the JWT, and check
    //    if it's valid and not expired.
    //
    // await
    // └─ "Pause here until the server responds." The browser sends the
    //    request and this line waits (without freezing the page) until
    //    the response comes back. Could be milliseconds or seconds.
    //
    // WHAT HAPPENS ON THE SERVER (routes/auth.js):
    //   1. Express catches GET /auth/me
    //   2. The requireAuth middleware runs FIRST — it reads the Authorization
    //      header, decodes the JWT, and checks the signature
    //   3. If valid: attaches the user info to req.user and lets it through
    //   4. The route handler responds with { user: { id, email, name, role } }
    //   5. If invalid: sends back a 401 (Unauthorized) error

    if (res.ok) {
      window.location.replace('/hub/hub.html');
      // ↑ res.ok = true if the status code is 200-299 (success).
      //   The server said "yes, this token is valid" → go to the hub.
      //   Again using .replace() so "Back" doesn't bring you here.
    } else {
      // ↑ The server said "no, this token is bad/expired."
      //   Clean up all the stale auth data from localStorage.
      localStorage.removeItem('vent_token');
      localStorage.removeItem('vent_role');
      localStorage.removeItem('vent_name');
      localStorage.removeItem('vent_user_id');
      // Now the user will see the login form (no redirect happened).
    }
  } catch {
    // ↑ If fetch() itself failed — usually means the server is not running.
    //   Don't clear anything. The token might still be valid, the server
    //   is just temporarily down. Let the user see the login form and
    //   they can try again.
  }
})();
// ↑ The final () that actually CALLS the function. Without this,
//   the function would be defined but never run.


// ════════════════════════════════════════════════════════════════════════════
// UI HELPERS — small utility functions used by the login/register forms
// ════════════════════════════════════════════════════════════════════════════
//
// These functions don't talk to the backend. They just manipulate the HTML
// on the page — showing/hiding things, swapping CSS classes, displaying
// error messages. Think of them as the cosmetics department.

function togglePw(inputId, btn) {
  // ↑ Called when you click the eye icon next to the password field.
  //   It toggles between showing and hiding the password.
  //
  //   inputId = the ID of the password input (e.g. 'loginPass')
  //   btn = the button element that was clicked (the eye icon)
  //
  //   In login.html this is wired up as:
  //     onclick="togglePw('loginPass', this)"
  //   "this" in an onclick always means "the element that was clicked."

  const inp  = document.getElementById(inputId);
  // ↑ Find the password input element on the page by its ID.

  const show = inp.type === 'password';
  // ↑ If the input type is currently 'password' (dots/bullets), we want
  //   to SHOW it — so show = true. If it's already 'text' (visible),
  //   we want to HIDE it — so show = false.
  //   This is a toggle: each click flips the state.

  inp.type = show ? 'text' : 'password';
  // ↑ The ternary operator:  condition ? valueIfTrue : valueIfFalse
  //   If show is true  → set type to 'text' (password becomes visible)
  //   If show is false → set type to 'password' (password becomes hidden)
  //
  //   Browser input types:
  //     type="password" → shows ••••••••
  //     type="text"     → shows the actual characters

  btn.querySelector('.eye-open').style.display = show ? 'none' : '';
  btn.querySelector('.eye-shut').style.display = show ? '' : 'none';
  // ↑ Swap which eye icon is visible:
  //   When showing password → hide the open eye, show the shut eye
  //   When hiding password  → show the open eye, hide the shut eye
  //
  //   querySelector('.eye-open') = "find the element with class 'eye-open'
  //   INSIDE this button." These are the two SVG eye icons in login.html.
  //
  //   style.display = 'none' → hide the element
  //   style.display = ''     → reset to default (show it)
}

function switchTab(tab, btn) {
  // ↑ Switches between the "Sign in" and "Register" panes.
  //   tab = 'login' or 'register'
  //   btn = the tab button that was clicked
  //
  //   NOTE: The register pane isn't currently in login.html — this function
  //   is here from when registration was on the same page. It's harmless
  //   but unused right now.

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  // ↑ Find ALL elements with class 'tab' and remove the 'on' class from
  //   each one. This "deselects" all tabs. Then the next line selects
  //   just the one that was clicked.
  //
  //   querySelectorAll() returns a list. .forEach() loops over it.
  //   t => t.classList.remove('on') is an arrow function (shorthand):
  //     "for each tab t, remove the class 'on' from its class list"

  btn.classList.add('on');
  // ↑ Add the 'on' class to the clicked tab. This highlights it (via CSS).

  document.getElementById('loginPane').classList.toggle('show', tab === 'login');
  document.getElementById('registerPane').classList.toggle('show', tab === 'register');
  // ↑ classList.toggle(className, force):
  //   If force is true  → ADD the class
  //   If force is false → REMOVE the class
  //
  //   So if tab === 'login':
  //     loginPane gets 'show' added    → visible
  //     registerPane gets 'show' removed → hidden
  //   And vice versa.
}

function showError(id, msg) {
  // ↑ Displays an error message on the page, then auto-clears it after 5 seconds.
  //   id  = the ID of the error element (e.g. 'loginErr')
  //   msg = the error text to show

  const el = document.getElementById(id);
  el.textContent = msg;
  // ↑ .textContent = set the text inside this element. Safe against XSS
  //   (it treats the string as plain text, not HTML — so even if msg
  //   contained <script>evil()</script>, it would show as literal text,
  //   not execute as code).

  setTimeout(() => { el.textContent = ''; }, 5000);
  // ↑ setTimeout(callback, milliseconds)
  //   "After 5000ms (5 seconds), run this function."
  //   The function clears the error text so it doesn't sit there forever.
  //   This is a nice UX touch — errors fade away on their own.
  //
  //   () => { ... } is an arrow function. Same as function() { ... }
  //   but shorter. We use arrow functions for small inline callbacks.
}

function setLoading(btnId, loading) {
  // ↑ Toggles a button between its normal state and a "loading" state.
  //   btnId   = the ID of the button (e.g. 'loginBtn')
  //   loading = true (show spinner) or false (restore button)
  //
  //   This prevents double-clicks and tells the user "I'm working on it."

  const btn = document.getElementById(btnId);
  if (loading) {
    btn.classList.add('btn-loading');
    // ↑ Add a CSS class that styles the button as "loading" (greyed out, etc.)

    btn.dataset.origHtml = btn.innerHTML;
    // ↑ SAVE the button's current HTML before we overwrite it.
    //   btn.dataset = a place to store custom data on any HTML element.
    //   btn.dataset.origHtml creates a data-orig-html attribute on the button.
    //   We save it so we can restore it later when loading is done.
    //
    //   btn.innerHTML = the full HTML content inside the button, including
    //   the <span> and <svg> tags. We need to save ALL of it.

    btn.innerHTML = '<span class="spinner"></span> Please wait...';
    // ↑ Replace the button content with a spinner + "Please wait" text.
  } else {
    btn.classList.remove('btn-loading');
    if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
    // ↑ Restore the button to its original state:
    //   Remove the loading CSS class, and put back the original HTML
    //   we saved earlier.
  }
}

function handleAuthSuccess(data) {
  // ↑ Called after a successful login (real or register). Saves the user's
  //   session info and redirects to the hub.
  //
  //   data = the response object from the server, shaped like:
  //   {
  //     token: "eyJhbGci...",          ← the JWT
  //     user: {
  //       id: "abc-123",
  //       email: "darren@company.com",
  //       name: "Darren",
  //       role: "admin"
  //     }
  //   }

  localStorage.setItem('vent_token',   data.token);
  localStorage.setItem('vent_role',    data.user.role);
  localStorage.setItem('vent_name',    data.user.name);
  localStorage.setItem('vent_user_id', data.user.id);
  // ↑ Store four pieces of info in the browser's localStorage:
  //
  //   vent_token   = the JWT. Every future API call to the backend will
  //                  include this token in the Authorization header so
  //                  the server knows who's making the request.
  //
  //   vent_role    = 'operator', 'qa', 'admin', etc. The frontend uses
  //                  this to decide what to show you. Operators see
  //                  the operator pages, QA sees the QA pages, etc.
  //
  //   vent_name    = your display name. Shown in the UI greeting.
  //
  //   vent_user_id = your unique ID. Used when saving things (deviations,
  //                  CAPAs, etc.) so the system knows who created them.
  //
  //   IMPORTANT: These are stored in the BROWSER, not on the server.
  //   If you clear your browser data, you'll need to log in again.
  //   If you open a different browser, you'll need to log in again.
  //   Each browser has its own localStorage.

  window.location.href = '/hub/hub.html';
  // ↑ Navigate to the hub page. Using .href (not .replace()) because
  //   after an active login, it's okay for "Back" to work — the user
  //   intentionally navigated here.
  //
  //   This is where the login page's job ENDS. From here, hub.html takes
  //   over. It will read vent_token and vent_role from localStorage to
  //   know who you are and what to show you.
}


// ════════════════════════════════════════════════════════════════════════════
// LOGIN — the real sign-in flow
// ════════════════════════════════════════════════════════════════════════════
//
// This is triggered by the "Sign in" button in login.html:
//   <button onclick="doLogin()">Sign in</button>
// OR by pressing Enter in the password field:
//   onkeydown="if(event.key==='Enter')doLogin()"
//
// THE FLOW:
//   1. Read email + password from the input fields
//   2. Validate (are they both filled in?)
//   3. Show a loading spinner on the button
//   4. Send email + password to the server (POST /auth/login)
//   5. Server checks Supabase for the user, verifies the password hash
//   6. If valid → server sends back a JWT + user info
//   7. We save that to localStorage and redirect to the hub
//   8. If invalid → show an error message, restore the button

async function doLogin() {
  // ↑ async = this function uses await (it pauses while the server responds).
  //   Without async, you can't use await inside the function.

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  // ↑ Read what the user typed into the email and password fields.
  //
  //   document.getElementById('loginEmail')
  //   └─ Find the <input id="loginEmail"> element in login.html
  //
  //   .value
  //   └─ Get the text the user has typed into that input
  //
  //   .trim()
  //   └─ Remove any whitespace from the start and end.
  //      " darren@company.com " → "darren@company.com"
  //      We trim email but NOT password — spaces in passwords are intentional.

  if (!email || !password) { showError('loginErr', 'Email and password are required'); return; }
  // ↑ Quick check: if either field is empty, show an error and stop.
  //   No point making a server call if we know it'll fail.
  //   return = stop the function here. Don't continue to the fetch() below.

  setLoading('loginBtn', true);
  // ↑ Swap the "Sign in" button to show a spinner. This does two things:
  //   1. Tells the user "I'm working on it"
  //   2. The btn-loading CSS class can disable the button to prevent
  //      double-clicks (clicking "Sign in" 5 times = 5 API calls)

  try {
    const res  = await fetch(SERVER + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    // ↑ THIS IS THE BACKEND CALL — the most important line in the file.
    //
    //   fetch(url, options) — send an HTTP request to the server.
    //
    //   SERVER + '/auth/login'
    //   └─ "http://localhost:3000/auth/login" (or production equivalent)
    //
    //   method: 'POST'
    //   └─ This is a POST request (sending data TO the server), not a GET
    //      (asking FOR data). Login sends credentials, so POST is correct.
    //      Convention: GET = read, POST = create/send, PUT = update, DELETE = remove
    //
    //   headers: { 'Content-Type': 'application/json' }
    //   └─ Tell the server "the data I'm sending is JSON format."
    //      Without this, the server's express.json() middleware wouldn't
    //      know how to parse the body, and req.body would be undefined.
    //
    //   body: JSON.stringify({ email, password })
    //   └─ The actual data we're sending. Broken down:
    //
    //      { email, password }
    //      └─ Shorthand for { email: email, password: password }
    //         When the key name matches the variable name, JavaScript
    //         lets you write it once. This is called "shorthand properties."
    //
    //      JSON.stringify(...)
    //      └─ Convert the JavaScript object into a JSON string.
    //         { email: "d@co.com", password: "abc123" }
    //         becomes: '{"email":"d@co.com","password":"abc123"}'
    //         HTTP sends text, not objects — so we have to convert.
    //
    // WHAT HAPPENS ON THE SERVER (routes/auth.js, lines 75-119):
    //   1. Express catches POST /auth/login
    //   2. express.json() middleware parses the body → req.body = { email, password }
    //   3. Looks up the email in Supabase (the database)
    //   4. If no user found → sends 401 { error: "Invalid email or password" }
    //   5. If found → verifies the password hash using lib/auth.js
    //   6. If password wrong → sends 401 { error: "Invalid email or password" }
    //      (same message for both — never reveal WHICH one was wrong,
    //       that would help attackers know they have a valid email)
    //   7. If password correct → creates a JWT token and sends back:
    //      { ok: true, token: "eyJ...", user: { id, email, name, role } }
    //   8. Also writes an audit log entry ("user signed in")

    const data = await res.json();
    // ↑ Parse the server's response body from JSON text into a JavaScript object.
    //   The server sent something like: '{"ok":true,"token":"eyJ...","user":{...}}'
    //   res.json() turns that back into a usable object.
    //   This is the reverse of JSON.stringify() above.

    if (!res.ok) { showError('loginErr', data.error || 'Sign in failed'); setLoading('loginBtn', false); return; }
    // ↑ If the server responded with an error (status 400, 401, 500, etc.):
    //   1. Show the server's error message (data.error), or a generic
    //      fallback if there isn't one
    //   2. Restore the button (remove the spinner)
    //   3. return = stop here, don't call handleAuthSuccess
    //
    //   data.error || 'Sign in failed'
    //   └─ "Use the server's error message if it exists, otherwise use
    //       the fallback." Same || pattern again.

    handleAuthSuccess(data);
    // ↑ SUCCESS! The server verified the credentials and sent back a token.
    //   handleAuthSuccess (defined above) saves everything to localStorage
    //   and redirects to /hub/hub.html. The login page's job is done.

  } catch {
    showError('loginErr', 'Server unreachable — try again in a moment');
    setLoading('loginBtn', false);
    // ↑ If fetch() itself threw an error (server is down, network is offline,
    //   DNS failed, etc.), show a "server unreachable" message and restore
    //   the button. The user can try again when the server is back.
  }
}
