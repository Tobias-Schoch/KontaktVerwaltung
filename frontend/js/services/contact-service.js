/**
 * Contact Service - Business Logic für Kontakte (API-basiert)
 */

import appState from '../state/app-state.js';
import { Contact } from '../models/contact.js';
import { validateContact } from '../utils/validation.js';
import { contactsApi, groupsApi } from './api-service.js';

class ContactService {
    /**
     * Neuen Kontakt erstellen
     */
    async create(data) {
        const contact = new Contact(data);
        const validation = validateContact(contact);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // Duplikat-Prüfung im lokalen State
        const contacts = appState.getContacts();
        const nameExists = contacts.find(c =>
            c.fields.firstName?.toLowerCase() === contact.fields.firstName?.toLowerCase() &&
            c.fields.lastName?.toLowerCase() === contact.fields.lastName?.toLowerCase()
        );

        if (nameExists) {
            throw new Error(`Kontakt "${contact.fields.firstName} ${contact.fields.lastName}" existiert bereits`);
        }

        if (contact.fields.email) {
            const emailExists = contacts.find(c =>
                c.fields.email?.toLowerCase() === contact.fields.email?.toLowerCase()
            );

            if (emailExists) {
                throw new Error(`Email-Adresse "${contact.fields.email}" wird bereits verwendet`);
            }
        }

        // API-Aufruf
        const created = await contactsApi.create(contact.toJSON());
        appState.addContact(created);
        return new Contact(created);
    }

    /**
     * Kontakt aktualisieren
     */
    async update(contactId, updates) {
        const contacts = appState.getContacts();
        const existing = contacts.find(c => c.id === contactId);

        if (!existing) {
            throw new Error('Kontakt nicht gefunden');
        }

        const updated = new Contact({ ...existing, ...updates });
        const validation = validateContact(updated);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // Duplikat-Prüfung
        const nameExists = contacts.find(c =>
            c.id !== contactId &&
            c.fields.firstName?.toLowerCase() === updated.fields.firstName?.toLowerCase() &&
            c.fields.lastName?.toLowerCase() === updated.fields.lastName?.toLowerCase()
        );

        if (nameExists) {
            throw new Error(`Kontakt "${updated.fields.firstName} ${updated.fields.lastName}" existiert bereits`);
        }

        if (updated.fields.email) {
            const emailExists = contacts.find(c =>
                c.id !== contactId &&
                c.fields.email?.toLowerCase() === updated.fields.email?.toLowerCase()
            );

            if (emailExists) {
                throw new Error(`Email-Adresse "${updated.fields.email}" wird bereits verwendet`);
            }
        }

        // API-Aufruf
        const result = await contactsApi.update(contactId, updates);
        appState.updateContact(contactId, result);
        return new Contact(result);
    }

    /**
     * Kontakt löschen
     */
    async delete(contactId) {
        const contacts = appState.getContacts();
        const contact = contacts.find(c => c.id === contactId);

        if (!contact) {
            throw new Error('Kontakt nicht gefunden');
        }

        // API-Aufruf (Backend entfernt automatisch aus Gruppen)
        await contactsApi.delete(contactId);

        // Lokalen State aktualisieren
        const groups = appState.getGroups();
        groups.forEach(group => {
            if (group.contactIds.includes(contactId)) {
                const updatedContactIds = group.contactIds.filter(id => id !== contactId);
                appState.updateGroup(group.id, { contactIds: updatedContactIds });
            }
        });

        appState.deleteContact(contactId);
        return true;
    }

    /**
     * Kontakt abrufen
     */
    get(contactId) {
        const contacts = appState.getContacts();
        const contact = contacts.find(c => c.id === contactId);
        return contact ? new Contact(contact) : null;
    }

    /**
     * Alle Kontakte abrufen
     */
    list(options = {}) {
        let contacts = appState.getContacts().map(c => new Contact(c));

        // Filter: Suche
        if (options.search) {
            contacts = contacts.filter(c => c.matchesSearch(options.search));
        }

        // Filter: Gruppe
        if (options.groupId) {
            contacts = contacts.filter(c => c.groupIds.includes(options.groupId));
        }

        // Filter: Archiviert
        if (options.includeArchived !== true) {
            contacts = contacts.filter(c => !c.archived);
        }

        // Sortierung
        const sortBy = options.sortBy || 'lastName';
        const sortOrder = options.sortOrder || 'asc';

        contacts.sort((a, b) => {
            let aVal, bVal;

            if (sortBy === 'fullName') {
                aVal = a.getFullName();
                bVal = b.getFullName();
            } else if (sortBy.startsWith('fields.')) {
                const fieldPath = sortBy.split('.');
                aVal = a.fields[fieldPath[1]] || '';
                bVal = b.fields[fieldPath[1]] || '';
            } else {
                aVal = a[sortBy] || '';
                bVal = b[sortBy] || '';
            }

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Pagination
        if (options.limit) {
            const offset = options.offset || 0;
            contacts = contacts.slice(offset, offset + options.limit);
        }

        return contacts;
    }

    /**
     * Kontakte suchen
     */
    search(query) {
        return this.list({ search: query });
    }

    /**
     * Kontakt zu Gruppe hinzufügen
     */
    async addToGroup(contactId, groupId) {
        const contact = this.get(contactId);
        if (!contact) {
            throw new Error('Kontakt nicht gefunden');
        }

        if (!contact.groupIds.includes(groupId)) {
            // API-Aufruf
            await groupsApi.addContact(groupId, contactId);

            // Lokalen State aktualisieren
            const updatedGroupIds = [...contact.groupIds, groupId];
            appState.updateContact(contactId, { groupIds: updatedGroupIds });

            const groups = appState.getGroups();
            const group = groups.find(g => g.id === groupId);
            if (group && !group.contactIds.includes(contactId)) {
                const updatedContactIds = [...group.contactIds, contactId];
                appState.updateGroup(groupId, { contactIds: updatedContactIds });
            }
        }
    }

    /**
     * Kontakt aus Gruppe entfernen
     */
    async removeFromGroup(contactId, groupId) {
        const contact = this.get(contactId);
        if (!contact) {
            throw new Error('Kontakt nicht gefunden');
        }

        // API-Aufruf
        await groupsApi.removeContact(groupId, contactId);

        // Lokalen State aktualisieren
        const updatedGroupIds = contact.groupIds.filter(id => id !== groupId);
        appState.updateContact(contactId, { groupIds: updatedGroupIds });

        const groups = appState.getGroups();
        const group = groups.find(g => g.id === groupId);
        if (group) {
            const updatedContactIds = group.contactIds.filter(id => id !== contactId);
            appState.updateGroup(groupId, { contactIds: updatedContactIds });
        }
    }

    /**
     * Kontakte nach IDs abrufen
     */
    getByIds(contactIds) {
        const contacts = appState.getContacts();
        return contactIds
            .map(id => contacts.find(c => c.id === id))
            .filter(Boolean)
            .map(c => new Contact(c));
    }

    /**
     * Statistiken
     */
    getStats() {
        const contacts = this.list();
        return {
            total: contacts.length,
            withEmail: contacts.filter(c => c.fields.email).length,
            withPhone: contacts.filter(c => c.fields.phone || c.fields.mobile).length,
            withCompany: contacts.filter(c => c.fields.company).length,
            archived: appState.getContacts().filter(c => c.archived).length
        };
    }
}

const contactService = new ContactService();
export default contactService;
