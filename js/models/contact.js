/**
 * Contact Model
 */

import { generateUUID } from '../utils/helpers.js';

export class Contact {
    constructor(data = {}) {
        this.id = data.id || generateUUID();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.fields = {
            firstName: data.fields?.firstName || '',
            lastName: data.fields?.lastName || '',
            gender: data.fields?.gender || '', // male, female, diverse
            email: data.fields?.email || '',
            phone: data.fields?.phone || '',
            mobile: data.fields?.mobile || '',
            company: data.fields?.company || '',
            address: {
                street: data.fields?.address?.street || '',
                city: data.fields?.address?.city || '',
                zip: data.fields?.address?.zip || '',
                country: data.fields?.address?.country || ''
            },
            notes: data.fields?.notes || '',
            ...this.extractCustomFields(data.fields)
        };
        this.groupIds = data.groupIds || [];
        this.tags = data.tags || [];
        this.archived = data.archived || false;
    }

    /**
     * Extrahiere Custom Fields aus Daten
     */
    extractCustomFields(fields = {}) {
        const standardFields = [
            'firstName', 'lastName', 'gender', 'email', 'phone', 'mobile',
            'company', 'address', 'notes'
        ];

        const customFields = {};
        for (const key in fields) {
            if (!standardFields.includes(key)) {
                customFields[key] = fields[key];
            }
        }

        return customFields;
    }

    /**
     * Zu Plain Object konvertieren
     */
    toJSON() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            fields: this.fields,
            groupIds: this.groupIds,
            tags: this.tags,
            archived: this.archived
        };
    }

    /**
     * Vollständigen Namen abrufen
     */
    getFullName() {
        const parts = [this.fields.firstName, this.fields.lastName].filter(Boolean);
        return parts.join(' ') || 'Unbenannt';
    }

    /**
     * Display-Name für UI
     */
    getDisplayName() {
        return this.getFullName();
    }

    /**
     * Anrede für Serienbriefe generieren
     */
    getSalutation() {
        const gender = this.fields.gender;
        if (gender === 'male') {
            return 'Sehr geehrter Herr';
        } else if (gender === 'female') {
            return 'Sehr geehrte Frau';
        } else {
            return 'Sehr geehrte/r'; // Neutral für diverse
        }
    }

    /**
     * Prüfen ob Kontakt einem Suchbegriff entspricht
     */
    matchesSearch(query) {
        if (!query) return true;

        const searchStr = query.toLowerCase();
        const searchableFields = [
            this.fields.firstName,
            this.fields.lastName,
            this.fields.email,
            this.fields.phone,
            this.fields.mobile,
            this.fields.company,
            this.fields.notes
        ];

        return searchableFields.some(field =>
            field && field.toLowerCase().includes(searchStr)
        );
    }

    /**
     * Kontakt aktualisieren
     */
    update(updates) {
        if (updates.fields) {
            this.fields = { ...this.fields, ...updates.fields };
        }
        if (updates.groupIds) {
            this.groupIds = updates.groupIds;
        }
        if (updates.tags) {
            this.tags = updates.tags;
        }
        if (typeof updates.archived !== 'undefined') {
            this.archived = updates.archived;
        }

        this.updatedAt = new Date().toISOString();
    }
}
