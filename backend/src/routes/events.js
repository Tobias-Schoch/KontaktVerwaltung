const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

/**
 * Transform DB row to API response format (matching frontend model)
 */
function transformEvent(row) {
  if (!row) return null;

  const groupIds = db.prepare(`
    SELECT group_id FROM event_groups WHERE event_id = ?
  `).all(row.id).map(r => r.group_id);

  const contactIds = db.prepare(`
    SELECT contact_id FROM event_contacts WHERE event_id = ?
  `).all(row.id).map(r => r.contact_id);

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    eventDate: row.event_date || '',
    location: row.location || '',
    attendees: {
      groupIds,
      contactIds
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * GET /api/v1/events - List all events
 */
router.get('/', (req, res, next) => {
  try {
    const { filter, sortBy = 'event_date', sortOrder = 'asc' } = req.query;

    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    // Filter by time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    if (filter === 'past') {
      query += ' AND event_date < ?';
      params.push(todayStr);
    } else if (filter === 'future') {
      query += ' AND event_date >= ?';
      params.push(todayStr);
    } else if (filter === 'today') {
      query += ' AND date(event_date) = date(?)';
      params.push(todayStr);
    }

    const validSortFields = ['name', 'event_date', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'event_date';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    const rows = db.prepare(query).all(...params);
    const events = rows.map(transformEvent);

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/events/:id - Get single event
 */
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!row) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/events - Create new event
 */
router.post('/', (req, res, next) => {
  try {
    const { id, name, description = '', eventDate = '', location = '', attendees = {} } = req.body;

    if (!name || !name.trim()) {
      const error = new Error('Event name is required');
      error.type = 'validation';
      throw error;
    }

    const eventId = id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (id, name, description, event_date, location, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(eventId, name.trim(), description, eventDate, location, now, now);

    // Add groups to event
    if (attendees.groupIds && attendees.groupIds.length > 0) {
      const groupStmt = db.prepare('INSERT OR IGNORE INTO event_groups (event_id, group_id) VALUES (?, ?)');
      for (const groupId of attendees.groupIds) {
        groupStmt.run(eventId, groupId);
      }
    }

    // Add contacts to event
    if (attendees.contactIds && attendees.contactIds.length > 0) {
      const contactStmt = db.prepare('INSERT OR IGNORE INTO event_contacts (event_id, contact_id) VALUES (?, ?)');
      for (const contactId of attendees.contactIds) {
        contactStmt.run(eventId, contactId);
      }
    }

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    res.status(201).json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/events/:id - Update event
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, eventDate, location, attendees } = req.body;

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE events SET
        name = ?,
        description = ?,
        event_date = ?,
        location = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      description !== undefined ? description : existing.description,
      eventDate !== undefined ? eventDate : existing.event_date,
      location !== undefined ? location : existing.location,
      now,
      id
    );

    // Update group attendees
    if (attendees?.groupIds !== undefined) {
      db.prepare('DELETE FROM event_groups WHERE event_id = ?').run(id);
      const groupStmt = db.prepare('INSERT OR IGNORE INTO event_groups (event_id, group_id) VALUES (?, ?)');
      for (const groupId of attendees.groupIds) {
        groupStmt.run(id, groupId);
      }
    }

    // Update contact attendees
    if (attendees?.contactIds !== undefined) {
      db.prepare('DELETE FROM event_contacts WHERE event_id = ?').run(id);
      const contactStmt = db.prepare('INSERT OR IGNORE INTO event_contacts (event_id, contact_id) VALUES (?, ?)');
      for (const contactId of attendees.contactIds) {
        contactStmt.run(id, contactId);
      }
    }

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/events/:id - Delete event
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    // Delete event (CASCADE will handle event_groups and event_contacts)
    db.prepare('DELETE FROM events WHERE id = ?').run(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/events/:id/groups/:groupId - Add group to event
 */
router.post('/:id/groups/:groupId', (req, res, next) => {
  try {
    const { id, groupId } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      const error = new Error('Group not found');
      error.type = 'not_found';
      throw error;
    }

    db.prepare('INSERT OR IGNORE INTO event_groups (event_id, group_id) VALUES (?, ?)').run(id, groupId);
    db.prepare('UPDATE events SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/events/:id/groups/:groupId - Remove group from event
 */
router.delete('/:id/groups/:groupId', (req, res, next) => {
  try {
    const { id, groupId } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    db.prepare('DELETE FROM event_groups WHERE event_id = ? AND group_id = ?').run(id, groupId);
    db.prepare('UPDATE events SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/events/:id/contacts/:contactId - Add contact to event
 */
router.post('/:id/contacts/:contactId', (req, res, next) => {
  try {
    const { id, contactId } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
    if (!contact) {
      const error = new Error('Contact not found');
      error.type = 'not_found';
      throw error;
    }

    db.prepare('INSERT OR IGNORE INTO event_contacts (event_id, contact_id) VALUES (?, ?)').run(id, contactId);
    db.prepare('UPDATE events SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/events/:id/contacts/:contactId - Remove contact from event
 */
router.delete('/:id/contacts/:contactId', (req, res, next) => {
  try {
    const { id, contactId } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      const error = new Error('Event not found');
      error.type = 'not_found';
      throw error;
    }

    db.prepare('DELETE FROM event_contacts WHERE event_id = ? AND contact_id = ?').run(id, contactId);
    db.prepare('UPDATE events SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(transformEvent(row));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
