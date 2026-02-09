/**
 * Group Model
 */

import { generateUUID } from '../utils/helpers.js';

export class Group {
    constructor(data = {}) {
        this.id = data.id || generateUUID();
        this.name = data.name || '';
        this.description = data.description || '';
        this.color = data.color || 'blue';
        this.contactIds = data.contactIds || [];
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Zu Plain Object konvertieren
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            contactIds: this.contactIds,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Kontakt zur Gruppe hinzufügen
     */
    addContact(contactId) {
        if (!this.contactIds.includes(contactId)) {
            this.contactIds.push(contactId);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Kontakt aus Gruppe entfernen
     */
    removeContact(contactId) {
        const index = this.contactIds.indexOf(contactId);
        if (index > -1) {
            this.contactIds.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Anzahl Mitglieder
     */
    getMemberCount() {
        return this.contactIds.length;
    }

    /**
     * Prüfen ob Kontakt in Gruppe ist
     */
    hasContact(contactId) {
        return this.contactIds.includes(contactId);
    }
}
