'use strict';

/**
 * routes/shift-handover.js — Thin HTTP layer for shift handover management.
 *
 * All business logic lives in services/shift-handover.service.js.
 */

module.exports = function(app, { auth, shiftHandoverService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /handovers — Create new handover (outgoing shift) ────
  app.post('/handovers',
    requireRole('operator', 'qa'),
    async (req, res) => {
      const { shiftType, openBatches, pendingSamples,
              equipmentHolds, safetyItems, notes } = req.body;
      try {
        const result = await shiftHandoverService.createHandover({
          shiftType,
          outgoingUser: req.user.name || req.user.id,
          outgoingRole: req.user.role,
          openBatches, pendingSamples, equipmentHolds, safetyItems, notes,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        if (err.message && err.message.includes('does not exist')) {
          return res.status(400).json({ error: 'shift_handovers table does not exist. Run the setup SQL.' });
        }
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /handovers — List with optional filters ─────────────────
  app.get('/handovers',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const { shiftDate, shiftType, status } = req.query;
        const data = await shiftHandoverService.listHandovers({ shiftDate, shiftType, status });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /handovers/stats — Dashboard statistics ─────────────────
  // NOTE: Must be before /:id to avoid matching "stats" as an id
  app.get('/handovers/stats',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const data = await shiftHandoverService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /handovers/current — Most recent open/pending for today ─
  app.get('/handovers/current',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const data = await shiftHandoverService.getCurrentHandover();
        res.json(data || { message: 'No open handover for today' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /handovers/unresolved — AI flag unresolved items ────────
  app.get('/handovers/unresolved',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const data = await shiftHandoverService.flagUnresolved({ req });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /handovers/:id — Single handover detail ─────────────────
  app.get('/handovers/:id',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const data = await shiftHandoverService.getHandover(req.params.id);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /handovers/:id — Update handover ────────────────────────
  app.put('/handovers/:id',
    requireRole('operator', 'qa'),
    async (req, res) => {
      const { shiftType, openBatches, pendingSamples,
              equipmentHolds, safetyItems, notes, status, reason } = req.body;
      try {
        const result = await shiftHandoverService.updateHandover({
          handoverId: req.params.id,
          shiftType, openBatches, pendingSamples,
          equipmentHolds, safetyItems, notes, status,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          reason, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /handovers/:id/acknowledge — Incoming shift ack ───────
  app.post('/handovers/:id/acknowledge',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const result = await shiftHandoverService.acknowledgeHandover({
          handoverId: req.params.id,
          incomingUser: req.user.name || req.user.id,
          incomingRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /handovers/:id/summarise — AI generates summary ───────
  app.post('/handovers/:id/summarise',
    requireRole('operator', 'qa'),
    async (req, res) => {
      try {
        const result = await shiftHandoverService.summariseHandover({
          handoverId: req.params.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
