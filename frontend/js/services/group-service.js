/**
 * Group Service - Business Logic für Gruppen (API-basiert)
 */

import appState from '../state/app-state.js';
import { Group } from '../models/group.js';
import { validateGroup } from '../utils/validation.js';
import { groupsApi } from './api-service.js';

class GroupService {
    /**
     * Neue Gruppe erstellen
     */
    async create(data) {
        const group = new Group(data);
        const validation = validateGroup(group);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // API-Aufruf
        const created = await groupsApi.create(group.toJSON());
        appState.addGroup(created);
        return new Group(created);
    }

    /**
     * Gruppe aktualisieren
     */
    async update(groupId, updates) {
        const groups = appState.getGroups();
        const existing = groups.find(g => g.id === groupId);

        if (!existing) {
            throw new Error('Gruppe nicht gefunden');
        }

        const updated = new Group({ ...existing, ...updates });
        const validation = validateGroup(updated);

        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
        }

        // API-Aufruf
        const result = await groupsApi.update(groupId, updates);
        appState.updateGroup(groupId, result);
        return new Group(result);
    }

    /**
     * Gruppe löschen
     */
    async delete(groupId) {
        const groups = appState.getGroups();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            throw new Error('Gruppe nicht gefunden');
        }

        // API-Aufruf (Backend entfernt automatisch aus Kontakten)
        await groupsApi.delete(groupId);

        // Lokalen State aktualisieren
        const contacts = appState.getContacts();
        contacts.forEach(contact => {
            if (contact.groupIds.includes(groupId)) {
                const updatedGroupIds = contact.groupIds.filter(id => id !== groupId);
                appState.updateContact(contact.id, { groupIds: updatedGroupIds });
            }
        });

        appState.deleteGroup(groupId);
        return true;
    }

    /**
     * Gruppe abrufen
     */
    get(groupId) {
        const groups = appState.getGroups();
        const group = groups.find(g => g.id === groupId);
        return group ? new Group(group) : null;
    }

    /**
     * Alle Gruppen abrufen
     */
    list(options = {}) {
        let groups = appState.getGroups().map(g => new Group(g));

        // Sortierung
        const sortBy = options.sortBy || 'name';
        const sortOrder = options.sortOrder || 'asc';

        groups.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';

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

        return groups;
    }

    /**
     * Kontakt zu Gruppe hinzufügen
     */
    async addContact(groupId, contactId) {
        const group = this.get(groupId);
        if (!group) {
            throw new Error('Gruppe nicht gefunden');
        }

        if (!group.contactIds.includes(contactId)) {
            // API-Aufruf
            await groupsApi.addContact(groupId, contactId);

            // Lokalen State aktualisieren
            const updatedContactIds = [...group.contactIds, contactId];
            appState.updateGroup(groupId, { contactIds: updatedContactIds });

            const contacts = appState.getContacts();
            const contact = contacts.find(c => c.id === contactId);
            if (contact && !contact.groupIds.includes(groupId)) {
                const updatedGroupIds = [...contact.groupIds, groupId];
                appState.updateContact(contactId, { groupIds: updatedGroupIds });
            }
        }
    }

    /**
     * Kontakt aus Gruppe entfernen
     */
    async removeContact(groupId, contactId) {
        const group = this.get(groupId);
        if (!group) {
            throw new Error('Gruppe nicht gefunden');
        }

        // API-Aufruf
        await groupsApi.removeContact(groupId, contactId);

        // Lokalen State aktualisieren
        const updatedContactIds = group.contactIds.filter(id => id !== contactId);
        appState.updateGroup(groupId, { contactIds: updatedContactIds });

        const contacts = appState.getContacts();
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            const updatedGroupIds = contact.groupIds.filter(id => id !== groupId);
            appState.updateContact(contactId, { groupIds: updatedGroupIds });
        }
    }

    /**
     * Alle Kontakte einer Gruppe abrufen
     */
    getContacts(groupId) {
        const group = this.get(groupId);
        if (!group) {
            throw new Error('Gruppe nicht gefunden');
        }

        const contacts = appState.getContacts();
        return group.contactIds
            .map(id => contacts.find(c => c.id === id))
            .filter(Boolean);
    }

    /**
     * Email-Adressen aller Gruppenmitglieder
     */
    getEmailAddresses(groupId) {
        const contacts = this.getContacts(groupId);
        return contacts
            .map(c => c.fields?.email)
            .filter(Boolean);
    }

    /**
     * Mailto-Link für alle Gruppenmitglieder (BCC)
     */
    getMailtoLink(groupId, defaultRecipient = '', subject = '') {
        const emails = this.getEmailAddresses(groupId);
        if (emails.length === 0) {
            throw new Error('Keine Email-Adressen in dieser Gruppe');
        }

        const group = this.get(groupId);
        const defaultSubject = subject || `Nachricht an ${group.name}`;
        const bcc = encodeURIComponent(emails.join(','));
        const to = defaultRecipient ? encodeURIComponent(defaultRecipient) : '';
        const subjectEncoded = encodeURIComponent(defaultSubject);

        return `mailto:${to}?subject=${subjectEncoded}&bcc=${bcc}`;
    }

    /**
     * Statistiken
     */
    getStats() {
        const groups = this.list();
        return {
            total: groups.length,
            withMembers: groups.filter(g => g.contactIds.length > 0).length,
            empty: groups.filter(g => g.contactIds.length === 0).length,
            avgMembersPerGroup: groups.length > 0
                ? Math.round(groups.reduce((sum, g) => sum + g.contactIds.length, 0) / groups.length)
                : 0
        };
    }

    /**
     * Verfügbare Farben für Gruppen
     */
    getAvailableColors() {
        return [
            { name: 'red', label: 'Rot' },
            { name: 'orange', label: 'Orange' },
            { name: 'amber', label: 'Bernstein' },
            { name: 'yellow', label: 'Gelb' },
            { name: 'lime', label: 'Limette' },
            { name: 'green', label: 'Grün' },
            { name: 'emerald', label: 'Smaragd' },
            { name: 'teal', label: 'Türkis' },
            { name: 'cyan', label: 'Cyan' },
            { name: 'sky', label: 'Himmelblau' },
            { name: 'blue', label: 'Blau' },
            { name: 'indigo', label: 'Indigo' },
            { name: 'violet', label: 'Violett' },
            { name: 'purple', label: 'Lila' },
            { name: 'fuchsia', label: 'Fuchsia' },
            { name: 'pink', label: 'Pink' },
            { name: 'rose', label: 'Rose' }
        ];
    }
}

const groupService = new GroupService();
export default groupService;
