/**
 * Event Model
 */

import { generateUUID } from '../utils/helpers.js';

export class Event {
    constructor(data = {}) {
        this.id = data.id || generateUUID();
        this.name = data.name || '';
        this.description = data.description || '';
        this.eventDate = data.eventDate || '';
        this.location = data.location || '';
        this.attendees = {
            groupIds: data.attendees?.groupIds || [],
            contactIds: data.attendees?.contactIds || []
        };
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
            eventDate: this.eventDate,
            location: this.location,
            attendees: this.attendees,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Gruppe zu Attendees hinzufügen
     */
    addGroup(groupId) {
        if (!this.attendees.groupIds.includes(groupId)) {
            this.attendees.groupIds.push(groupId);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Gruppe aus Attendees entfernen
     */
    removeGroup(groupId) {
        const index = this.attendees.groupIds.indexOf(groupId);
        if (index > -1) {
            this.attendees.groupIds.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Kontakt zu Attendees hinzufügen
     */
    addContact(contactId) {
        if (!this.attendees.contactIds.includes(contactId)) {
            this.attendees.contactIds.push(contactId);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Kontakt aus Attendees entfernen
     */
    removeContact(contactId) {
        const index = this.attendees.contactIds.indexOf(contactId);
        if (index > -1) {
            this.attendees.contactIds.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Prüfen ob Event in der Vergangenheit liegt
     */
    isPast() {
        if (!this.eventDate) return false;
        return new Date(this.eventDate) < new Date();
    }

    /**
     * Prüfen ob Event in der Zukunft liegt
     */
    isFuture() {
        if (!this.eventDate) return false;
        return new Date(this.eventDate) > new Date();
    }

    /**
     * Prüfen ob Event heute ist
     */
    isToday() {
        if (!this.eventDate) return false;
        const today = new Date();
        const eventDate = new Date(this.eventDate);
        return (
            eventDate.getDate() === today.getDate() &&
            eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear()
        );
    }
}
