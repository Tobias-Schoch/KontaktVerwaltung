/**
 * Event Service - Business Logic für Events (API-basiert)
 */

import appState from '../state/app-state.js';
import groupService from './group-service.js';
import { Event } from '../models/event.js';
import { validateEvent } from '../utils/validation.js';
import { eventsApi } from './api-service.js';

class EventService {
    /**
     * Neues Event erstellen
     */
    async create(data) {
        const event = new Event(data);
        const validation = validateEvent(event);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // API-Aufruf
        const created = await eventsApi.create(event.toJSON());
        appState.addEvent(created);
        return new Event(created);
    }

    /**
     * Event aktualisieren
     */
    async update(eventId, updates) {
        const events = appState.getEvents();
        const existing = events.find(e => e.id === eventId);

        if (!existing) {
            throw new Error('Event nicht gefunden');
        }

        const updated = new Event({ ...existing, ...updates });
        const validation = validateEvent(updated);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // API-Aufruf
        const result = await eventsApi.update(eventId, updates);
        appState.updateEvent(eventId, result);
        return new Event(result);
    }

    /**
     * Event löschen
     */
    async delete(eventId) {
        const events = appState.getEvents();
        const event = events.find(e => e.id === eventId);

        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        // API-Aufruf
        await eventsApi.delete(eventId);
        appState.deleteEvent(eventId);
        return true;
    }

    /**
     * Event abrufen
     */
    get(eventId) {
        const events = appState.getEvents();
        const event = events.find(e => e.id === eventId);
        return event ? new Event(event) : null;
    }

    /**
     * Alle Events abrufen
     */
    list(options = {}) {
        let events = appState.getEvents().map(e => new Event(e));

        // Filter: Past/Future
        if (options.filterBy === 'past') {
            events = events.filter(e => e.isPast());
        } else if (options.filterBy === 'future') {
            events = events.filter(e => e.isFuture());
        } else if (options.filterBy === 'today') {
            events = events.filter(e => e.isToday());
        }

        // Sortierung nach Datum
        const sortOrder = options.sortOrder || 'asc';
        events.sort((a, b) => {
            const aDate = new Date(a.eventDate || 0);
            const bDate = new Date(b.eventDate || 0);

            if (sortOrder === 'asc') {
                return aDate - bDate;
            } else {
                return bDate - aDate;
            }
        });

        return events;
    }

    /**
     * Alle Attendees eines Events (dedupliziert)
     */
    getAttendees(eventId) {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        const contacts = appState.getContacts();
        const attendeeIds = new Set();

        // Contacts aus Groups
        event.attendees.groupIds.forEach(groupId => {
            try {
                const groupContacts = groupService.getContacts(groupId);
                groupContacts.forEach(contact => attendeeIds.add(contact.id));
            } catch (error) {
                console.warn(`Gruppe ${groupId} nicht gefunden`);
            }
        });

        // Individuelle Contacts
        event.attendees.contactIds.forEach(contactId => {
            attendeeIds.add(contactId);
        });

        // Contacts holen
        return [...attendeeIds]
            .map(id => contacts.find(c => c.id === id))
            .filter(Boolean);
    }

    /**
     * Email-Adressen aller Attendees
     */
    getEmailAddresses(eventId) {
        const attendees = this.getAttendees(eventId);
        return attendees
            .map(c => c.fields?.email)
            .filter(Boolean);
    }

    /**
     * Mailto-Link für alle Attendees
     */
    getMailtoLink(eventId, defaultRecipient = '') {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        const emails = this.getEmailAddresses(eventId);
        if (emails.length === 0) {
            throw new Error('Keine Email-Adressen vorhanden');
        }

        const subject = encodeURIComponent(`Einladung: ${event.name}`);
        const bcc = encodeURIComponent(emails.join(','));
        const to = defaultRecipient ? encodeURIComponent(defaultRecipient) : '';

        return `mailto:${to}?subject=${subject}&bcc=${bcc}`;
    }

    /**
     * Gruppe zu Event hinzufügen
     */
    async addGroup(eventId, groupId) {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        if (!event.attendees.groupIds.includes(groupId)) {
            // API-Aufruf
            await eventsApi.addGroup(eventId, groupId);

            // Lokalen State aktualisieren
            const updatedGroupIds = [...event.attendees.groupIds, groupId];
            const updatedAttendees = { ...event.attendees, groupIds: updatedGroupIds };
            appState.updateEvent(eventId, { attendees: updatedAttendees });
        }
    }

    /**
     * Gruppe aus Event entfernen
     */
    async removeGroup(eventId, groupId) {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        // API-Aufruf
        await eventsApi.removeGroup(eventId, groupId);

        // Lokalen State aktualisieren
        const updatedGroupIds = event.attendees.groupIds.filter(id => id !== groupId);
        const updatedAttendees = { ...event.attendees, groupIds: updatedGroupIds };
        appState.updateEvent(eventId, { attendees: updatedAttendees });
    }

    /**
     * Kontakt zu Event hinzufügen
     */
    async addContact(eventId, contactId) {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        if (!event.attendees.contactIds.includes(contactId)) {
            // API-Aufruf
            await eventsApi.addContact(eventId, contactId);

            // Lokalen State aktualisieren
            const updatedContactIds = [...event.attendees.contactIds, contactId];
            const updatedAttendees = { ...event.attendees, contactIds: updatedContactIds };
            appState.updateEvent(eventId, { attendees: updatedAttendees });
        }
    }

    /**
     * Kontakt aus Event entfernen
     */
    async removeContact(eventId, contactId) {
        const event = this.get(eventId);
        if (!event) {
            throw new Error('Event nicht gefunden');
        }

        // API-Aufruf
        await eventsApi.removeContact(eventId, contactId);

        // Lokalen State aktualisieren
        const updatedContactIds = event.attendees.contactIds.filter(id => id !== contactId);
        const updatedAttendees = { ...event.attendees, contactIds: updatedContactIds };
        appState.updateEvent(eventId, { attendees: updatedAttendees });
    }

    /**
     * Statistiken
     */
    getStats() {
        const events = this.list();
        const now = new Date();

        return {
            total: events.length,
            past: events.filter(e => e.isPast()).length,
            future: events.filter(e => e.isFuture()).length,
            today: events.filter(e => e.isToday()).length
        };
    }
}

const eventService = new EventService();
export default eventService;
