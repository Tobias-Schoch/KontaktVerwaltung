const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'light',
  accentColor: 'blue',
  defaultEmail: '',
  animationsEnabled: true,
  storageMode: 'server'
};

/**
 * GET /api/v1/settings - Get all settings
 */
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();

    // Start with defaults
    const settings = { ...DEFAULT_SETTINGS };

    // Override with stored values
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/settings - Update settings
 */
router.put('/', (req, res, next) => {
  try {
    const updates = req.body;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    for (const [key, value] of Object.entries(updates)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      stmt.run(key, serialized, now);
    }

    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/settings/:key - Get single setting
 */
router.get('/:key', (req, res, next) => {
  try {
    const { key } = req.params;
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);

    if (!row) {
      // Return default if exists
      if (key in DEFAULT_SETTINGS) {
        return res.json({ [key]: DEFAULT_SETTINGS[key] });
      }
      const error = new Error('Setting not found');
      error.type = 'not_found';
      throw error;
    }

    let value;
    try {
      value = JSON.parse(row.value);
    } catch {
      value = row.value;
    }

    res.json({ [key]: value });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
