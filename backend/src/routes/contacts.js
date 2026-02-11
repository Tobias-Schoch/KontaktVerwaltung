const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

/**
 * Transform DB row to API response format (matching frontend model)
 */
function transformContact(row) {
  if (!row) return null;

  const groupIds = db.prepare(`
    SELECT group_id FROM contact_groups WHERE contact_id = ?
  `).all(row.id).map(r => r.group_id);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fields: {
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      gender: row.gender || '',
      email: row.email || '',
      phone: row.phone || '',
      mobile: row.mobile || '',
      company: row.company || '',
      address: {
        street: row.street || '',
        city: row.city || '',
        zip: row.zip || '',
        country: row.country || ''
      },
      notes: row.notes || '',
      ...JSON.parse(row.custom_fields || '{}')
    },
    groupIds,
    tags: JSON.parse(row.tags || '[]'),
    archived: Boolean(row.archived)
  };
}

/**
 * GET /api/v1/contacts - List all contacts
 */
router.get('/', (req, res, next) => {
  try {
    const { search, archived, sortBy = 'last_name', sortOrder = 'asc' } = req.query;

    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    // Filter archived
    if (archived !== undefined) {
      query += ' AND archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    }

    // Search
    if (search) {
      query += ` AND (
        first_name LIKE ? OR
        last_name LIKE ? OR
        email LIKE ? OR
        phone LIKE ? OR
        mobile LIKE ? OR
        company LIKE ? OR
        notes LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Sort
    const validSortFields = ['first_name', 'last_name', 'email', 'company', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'last_name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    const rows = db.prepare(query).all(...params);
    const contacts = rows.map(transformContact);

    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/contacts/:id - Get single contact
 */
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);

    if (!row) {
      const error = new Error('Contact not found');
      error.type = 'not_found';
      throw error;
    }

    res.json(transformContact(row));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/contacts - Create new contact
 */
router.post('/', (req, res, next) => {
  try {
    const { id, fields = {}, groupIds = [], tags = [], archived = false } = req.body;
    const contactId = id || uuidv4();
    const now = new Date().toISOString();

    // Extract custom fields
    const standardFields = ['firstName', 'lastName', 'gender', 'email', 'phone', 'mobile', 'company', 'address', 'notes'];
    const customFields = {};
    for (const key in fields) {
      if (!standardFields.includes(key)) {
        customFields[key] = fields[key];
      }
    }

    const stmt = db.prepare(`
      INSERT INTO contacts (
        id, first_name, last_name, gender, email, phone, mobile, company,
        street, city, zip, country, notes, tags, custom_fields, archived,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      contactId,
      fields.firstName || '',
      fields.lastName || '',
      fields.gender || '',
      fields.email || '',
      fields.phone || '',
      fields.mobile || '',
      fields.company || '',
      fields.address?.street || '',
      fields.address?.city || '',
      fields.address?.zip || '',
      fields.address?.country || '',
      fields.notes || '',
      JSON.stringify(tags),
      JSON.stringify(customFields),
      archived ? 1 : 0,
      now,
      now
    );

    // Add to groups
    if (groupIds.length > 0) {
      const groupStmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
      for (const groupId of groupIds) {
        groupStmt.run(contactId, groupId);
      }
    }

    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
    res.status(201).json(transformContact(row));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/contacts/:id - Update contact
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { fields = {}, groupIds, tags, archived } = req.body;

    // Check if contact exists
    const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Contact not found');
      error.type = 'not_found';
      throw error;
    }

    const now = new Date().toISOString();

    // Extract custom fields
    const standardFields = ['firstName', 'lastName', 'gender', 'email', 'phone', 'mobile', 'company', 'address', 'notes'];
    const existingCustomFields = JSON.parse(existing.custom_fields || '{}');
    const customFields = { ...existingCustomFields };
    for (const key in fields) {
      if (!standardFields.includes(key)) {
        customFields[key] = fields[key];
      }
    }

    const stmt = db.prepare(`
      UPDATE contacts SET
        first_name = ?,
        last_name = ?,
        gender = ?,
        email = ?,
        phone = ?,
        mobile = ?,
        company = ?,
        street = ?,
        city = ?,
        zip = ?,
        country = ?,
        notes = ?,
        tags = ?,
        custom_fields = ?,
        archived = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      fields.firstName ?? existing.first_name,
      fields.lastName ?? existing.last_name,
      fields.gender ?? existing.gender,
      fields.email ?? existing.email,
      fields.phone ?? existing.phone,
      fields.mobile ?? existing.mobile,
      fields.company ?? existing.company,
      fields.address?.street ?? existing.street,
      fields.address?.city ?? existing.city,
      fields.address?.zip ?? existing.zip,
      fields.address?.country ?? existing.country,
      fields.notes ?? existing.notes,
      tags !== undefined ? JSON.stringify(tags) : existing.tags,
      JSON.stringify(customFields),
      archived !== undefined ? (archived ? 1 : 0) : existing.archived,
      now,
      id
    );

    // Update group memberships
    if (groupIds !== undefined) {
      db.prepare('DELETE FROM contact_groups WHERE contact_id = ?').run(id);
      const groupStmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
      for (const groupId of groupIds) {
        groupStmt.run(id, groupId);
      }
    }

    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    res.json(transformContact(row));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/contacts/:id - Delete contact
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Contact not found');
      error.type = 'not_found';
      throw error;
    }

    // Delete contact (CASCADE will handle contact_groups and event_contacts)
    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
