'use strict';
const crypto = require('crypto');
const { createToken, hashPassword, verifyPassword } = require('../lib/auth');

module.exports = function(app, { supabase, auditLog, auth }) {
  const { requireAuth } = auth;

  // POST /auth/register — create a new user account
  // Prototype mode: open registration. For production, re-enable admin-only gate.
  app.post('/auth/register', async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name, and role are required' });
    }

    const validRoles = ['operator', 'qa', 'director', 'msat', 'engineering', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (existing && existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password and create user
    const { hash, salt } = hashPassword(password);
    const userId = crypto.randomUUID();

    const { error } = await supabase.from('users').insert({
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      password_hash: hash,
      password_salt: salt
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        return res.status(400).json({ error: 'users table does not exist. Run the setup SQL from GET /admin/setup' });
      }
      return res.status(500).json({ error: error.message });
    }

    // Create token
    const token = createToken({ id: userId, email: email.toLowerCase().trim(), name: name.trim(), role });

    await auditLog({
      userId: name.trim(),
      userRole: role,
      action: 'user_registered',
      entityType: 'user',
      entityId: userId,
      after: { email, name, role },
      reason: 'New user account created',
      req
    });

    res.json({ ok: true, token, user: { id: userId, email, name: name.trim(), role } });
  });

  // POST /auth/login — sign in with email and password
  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        return res.status(400).json({ error: 'users table does not exist. Run the setup SQL.' });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!users || !users.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });

    await auditLog({
      userId: user.name,
      userRole: user.role,
      action: 'user_login',
      entityType: 'user',
      entityId: user.id,
      after: { email: user.email, role: user.role },
      reason: 'User signed in',
      req
    });

    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // GET /auth/me — verify token and return current user info
  app.get('/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // POST /auth/change-password — change password for current user
  app.post('/auth/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .limit(1);

    if (!users || !users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const { hash, salt } = hashPassword(newPassword);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash, password_salt: salt, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    await auditLog({
      userId: user.name,
      userRole: user.role,
      action: 'password_changed',
      entityType: 'user',
      entityId: user.id,
      after: {},
      reason: 'User changed their password',
      req
    });

    res.json({ ok: true });
  });
};
