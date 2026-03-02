'use strict';

/**
 * routes/chat.js — Thin HTTP layer for chat sessions, analysis, search, and todos.
 *
 * All business logic lives in services/chat.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, chatService }) {
  const { requireAuth } = auth;

  // ── Session CRUD ────────────────────────────────────────────────────────

  app.get('/chat/sessions', requireAuth, async (req, res) => {
    try {
      const data = await chatService.listSessions(req.user.id || req.user.email);
      res.json(data);
    } catch (err) {
      console.error('Chat sessions list error:', err);
      res.status(500).json({ error: 'Failed to load chat sessions' });
    }
  });

  app.post('/chat/sessions', requireAuth, async (req, res) => {
    const { title, messages } = req.body;
    try {
      const data = await chatService.createSession(req.user.id || req.user.email, title, messages);
      res.json(data);
    } catch (err) {
      console.error('Chat session create error:', err);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  app.post('/chat/analyse', requireAuth, async (req, res) => {
    try {
      const result = await chatService.analyseSessions(req.user.id || req.user.email);
      res.json(result);
    } catch (err) {
      console.error('Chat analysis error:', err);
      res.status(500).json({ error: 'Analysis failed: ' + err.message });
    }
  });

  app.get('/chat/sessions/:id', requireAuth, async (req, res) => {
    try {
      const data = await chatService.getSession(req.user.id || req.user.email, req.params.id);
      if (!data) return res.status(404).json({ error: 'Session not found' });
      res.json(data);
    } catch (err) {
      console.error('Chat session get error:', err);
      res.status(500).json({ error: 'Failed to load chat session' });
    }
  });

  app.put('/chat/sessions/:id', requireAuth, async (req, res) => {
    const { title, messages } = req.body;
    try {
      const data = await chatService.updateSession(req.user.id || req.user.email, req.params.id, { title, messages });
      res.json(data);
    } catch (err) {
      console.error('Chat session update error:', err);
      res.status(500).json({ error: 'Failed to update chat session' });
    }
  });

  // Bulk delete must be before :id route
  app.delete('/chat/sessions', requireAuth, async (req, res) => {
    try {
      const result = await chatService.deleteAllSessions(req.user.id || req.user.email);
      res.json(result);
    } catch (err) {
      console.error('Bulk delete sessions error:', err);
      res.status(500).json({ error: 'Failed to clear sessions' });
    }
  });

  app.delete('/chat/sessions/:id', requireAuth, async (req, res) => {
    try {
      const result = await chatService.deleteSession(req.user.id || req.user.email, req.params.id);
      res.json(result);
    } catch (err) {
      console.error('Chat session delete error:', err);
      res.status(500).json({ error: 'Failed to delete chat session' });
    }
  });

  // ── AI-powered features ─────────────────────────────────────────────────

  app.post('/chat/export-to-doc', requireAuth, async (req, res) => {
    const { messages, title } = req.body;
    if (!messages || !messages.length) return res.status(400).json({ error: 'No messages provided' });
    try {
      const data = await chatService.exportToDoc(messages, title);
      res.json(data);
    } catch (err) {
      console.error('Export to doc error:', err);
      res.status(500).json({ error: 'Export failed: ' + err.message });
    }
  });

  app.post('/chat/search', requireAuth, async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    try {
      const result = await chatService.searchSessions(req.user.id || req.user.email, query);
      res.json(result);
    } catch (err) {
      console.error('Chat search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ── Dev To-Dos ──────────────────────────────────────────────────────────

  app.get('/todos', requireAuth, async (req, res) => {
    try {
      const data = await chatService.listTodos(req.user.id || req.user.email, req.query.page);
      res.json(data);
    } catch (err) {
      console.error('Todos list error:', err);
      res.status(500).json({ error: 'Failed to load todos' });
    }
  });

  app.post('/todos', requireAuth, async (req, res) => {
    const { title, parent_id, page } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
      const data = await chatService.createTodo(req.user.id || req.user.email, title, parent_id, page);
      res.json(data);
    } catch (err) {
      console.error('Todo create error:', err);
      res.status(500).json({ error: 'Failed to create todo' });
    }
  });

  app.patch('/todos/:id', requireAuth, async (req, res) => {
    const { title, done, position, page } = req.body;
    try {
      const data = await chatService.updateTodo(req.user.id || req.user.email, req.params.id, { title, done, position, page });
      res.json(data);
    } catch (err) {
      console.error('Todo update error:', err);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  });

  app.delete('/todos/:id', requireAuth, async (req, res) => {
    try {
      const result = await chatService.deleteTodo(req.user.id || req.user.email, req.params.id, req.query.page);
      res.json(result);
    } catch (err) {
      console.error('Todo delete error:', err);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  });
};
