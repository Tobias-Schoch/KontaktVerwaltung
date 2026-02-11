const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

/**
 * Transform DB row to API response format (matching frontend model)
 */
function transformGroup(row) {
  if (!row) return null;

  const contactIds = db.prepare(`
    SELECT contact_id FROM contact_groups WHERE group_id = ?
  `).all(row.id).map(r => r.contact_id);

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    color: row.color || 'blue',
    contactIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * GET /api/v1/groups - List all groups
 */
router.get('/', (req, res, next) => {
  try {
    const { sortBy = 'name', sortOrder = 'asc' } = req.query;

    const validSortFields = ['name', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const rows = db.prepare(`SELECT * FROM groups ORDER BY ${sortField} ${order}`).all();
    const groups = rows.map(transformGroup);

    res.json(groups);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/groups/:id - Get single group
 */
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);

    if (!row) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    res.json(transformGroup(row));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/groups - Create new group
 */
router.post('/', (req, res, next) => {
  try {
    const { id, name, description = '', color = 'blue', contactIds = [] } = req.body;

    if (!name || !name.trim()) {
      const error = new Error('Group name is required');
      error.type = 'validation';
      throw error;
    }

    const groupId = id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO groups (id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(groupId, name.trim(), description, color, now, now);

    // Add contacts to group
    if (contactIds.length > 0) {
      const contactStmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
      for (const contactId of contactIds) {
        contactStmt.run(contactId, groupId);
      }
    }

    const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    res.status(201).json(transformGroup(row));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/groups/:id - Update group
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, contactIds } = req.body;

    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE groups SET
        name = ?,
        description = ?,
        color = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      description !== undefined ? description : existing.description,
      color !== undefined ? color : existing.color,
      now,
      id
    );

    // Update contact memberships
    if (contactIds !== undefined) {
      db.prepare('DELETE FROM contact_groups WHERE group_id = ?').run(id);
      const contactStmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
      for (const contactId of contactIds) {
        contactStmt.run(contactId, id);
      }
    }

    const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json(transformGroup(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/groups/:id - Delete group
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    // Delete group (CASCADE will handle contact_groups and event_groups)
    db.prepare('DELETE FROM groups WHERE id = ?').run(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/groups/:id/contacts/:contactId - Add contact to group
 */
router.post('/:id/contacts/:contactId', (req, res, next) => {
  try {
    const { id, contactId } = req.params;

    // Check if group exists
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!group) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    // Check if contact exists
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
    if (!contact) {
      const error = new Error('Contact not found');
      error.type = 'not_found';
      throw error;
    }

    // Add contact to group
    db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)').run(contactId, id);

    // Update group timestamp
    db.prepare('UPDATE groups SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json(transformGroup(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/groups/:id/contacts/:contactId - Remove contact from group
 */
router.delete('/:id/contacts/:contactId', (req, res, next) => {
  try {
    const { id, contactId } = req.params;

    // Check if group exists
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!group) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    // Remove contact from group
    db.prepare('DELETE FROM contact_groups WHERE contact_id = ? AND group_id = ?').run(contactId, id);

    // Update group timestamp
    db.prepare('UPDATE groups SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json(transformGroup(row));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
