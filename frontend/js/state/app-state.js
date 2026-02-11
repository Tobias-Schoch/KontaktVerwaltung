/**
 * App State Manager - Observer Pattern
 * Zentraler State für die gesamte Anwendung (API-basiert)
 */

import { contactsApi, groupsApi, eventsApi, settingsApi, healthApi } from '../services/api-service.js';

class AppState {
    constructor() {
        this.state = {
            contacts: [],
            groups: [],
            events: [],
            customFields: [],
            settings: {
                theme: 'light',
                accentColor: 'sky',
                defaultEmail: '',
                animationsEnabled: true,
                storageMode: 'server'
            },
            history: [],
            ui: {
                currentView: 'contacts',
                selectedContacts: new Set(),
                isLoading: false,
                isConnected: false
            }
        };

        this.observers = new Map();
        this.eventId = 0;
    }

    /**
     * State abrufen
     */
    getState() {
        return this.state;
    }

    /**
     * Partielles Update des States
     */
    setState(updates, eventType = 'state:changed') {
        const oldState = { ...this.state };

        // Deep merge für verschachtelte Objekte
        this.state = this.deepMerge(this.state, updates);

        // Notify observers
        this.emit(eventType, {
            state: this.state,
            oldState,
            updates
        });
    }

    /**
     * Observer registrieren
     */
    subscribe(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, new Map());
        }

        const id = ++this.eventId;
        this.observers.get(event).set(id, callback);

        // Return unsubscribe function
        return () => {
            const eventObservers = this.observers.get(event);
            if (eventObservers) {
                eventObservers.delete(id);
            }
        };
    }

    /**
     * Event emittieren
     */
    emit(event, data) {
        const eventObservers = this.observers.get(event);
        if (eventObservers) {
            eventObservers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in observer for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Deep Merge Objekte
     */
    deepMerge(target, source) {
        const output = { ...target };

        for (const key in source) {
            if (source[key] instanceof Object && key in target && !(source[key] instanceof Set)) {
                output[key] = this.deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        }

        return output;
    }

    /**
     * Daten vom Server laden
     */
    async loadFromServer() {
        this.state.ui.isLoading = true;
        this.emit('state:loading', true);

        try {
            // Health-Check
            await healthApi.check();
            this.state.ui.isConnected = true;

            // Daten parallel laden
            const [contacts, groups, events, settings] = await Promise.all([
                contactsApi.list(),
                groupsApi.list(),
                eventsApi.list(),
                settingsApi.get()
            ]);

            this.state.contacts = contacts;
            this.state.groups = groups;
            this.state.events = events;
            this.state.settings = { ...this.state.settings, ...settings };

            this.emit('state:loaded', this.state);
            console.log('✅ Daten vom Server geladen:', {
                contacts: contacts.length,
                groups: groups.length,
                events: events.length
            });

            return true;
        } catch (error) {
            console.error('❌ Fehler beim Laden vom Server:', error);
            this.state.ui.isConnected = false;
            this.emit('state:error', error);
            return false;
        } finally {
            this.state.ui.isLoading = false;
            this.emit('state:loading', false);
        }
    }

    /**
     * Kontakte
     */
    getContacts() {
        return this.state.contacts;
    }

    addContact(contact) {
        this.state.contacts.push(contact);
        this.emit('contacts:added', contact);
    }

    updateContact(contactId, updates) {
        const index = this.state.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            const oldContact = { ...this.state.contacts[index] };
            // Wenn updates ein komplettes Objekt ist, ersetze es, sonst merge
            if (updates.id && updates.fields) {
                this.state.contacts[index] = updates;
            } else {
                this.state.contacts[index] = { ...oldContact, ...updates, updatedAt: new Date().toISOString() };
            }
            this.emit('contacts:updated', { contact: this.state.contacts[index], oldContact });
        }
    }

    deleteContact(contactId) {
        const index = this.state.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            const deleted = this.state.contacts.splice(index, 1)[0];
            this.emit('contacts:deleted', deleted);
        }
    }

    /**
     * Gruppen
     */
    getGroups() {
        return this.state.groups;
    }

    addGroup(group) {
        this.state.groups.push(group);
        this.emit('groups:added', group);
    }

    updateGroup(groupId, updates) {
        const index = this.state.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            const oldGroup = { ...this.state.groups[index] };
            // Wenn updates ein komplettes Objekt ist, ersetze es, sonst merge
            if (updates.id && updates.name !== undefined) {
                this.state.groups[index] = updates;
            } else {
                this.state.groups[index] = { ...oldGroup, ...updates, updatedAt: new Date().toISOString() };
            }
            this.emit('groups:updated', { group: this.state.groups[index], oldGroup });
        }
    }

    deleteGroup(groupId) {
        const index = this.state.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            const deleted = this.state.groups.splice(index, 1)[0];
            this.emit('groups:deleted', deleted);
        }
    }

    /**
     * Events
     */
    getEvents() {
        return this.state.events;
    }

    addEvent(event) {
        this.state.events.push(event);
        this.emit('events:added', event);
    }

    updateEvent(eventId, updates) {
        const index = this.state.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const oldEvent = { ...this.state.events[index] };
            // Wenn updates ein komplettes Objekt ist, ersetze es, sonst merge
            if (updates.id && updates.name !== undefined) {
                this.state.events[index] = updates;
            } else {
                this.state.events[index] = { ...oldEvent, ...updates, updatedAt: new Date().toISOString() };
            }
            this.emit('events:updated', { event: this.state.events[index], oldEvent });
        }
    }

    deleteEvent(eventId) {
        const index = this.state.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const deleted = this.state.events.splice(index, 1)[0];
            this.emit('events:deleted', deleted);
        }
    }

    /**
     * Custom Fields
     */
    getCustomFields() {
        return this.state.customFields;
    }

    addCustomField(field) {
        this.state.customFields.push(field);
        this.emit('customFields:added', field);
    }

    /**
     * Settings
     */
    getSettings() {
        return this.state.settings;
    }

    async updateSettings(updates) {
        // Update lokal
        this.state.settings = { ...this.state.settings, ...updates };
        this.emit('settings:updated', this.state.settings);

        // An Server senden
        try {
            await settingsApi.update(updates);
        } catch (error) {
            console.error('Fehler beim Speichern der Settings:', error);
        }
    }

    /**
     * Vollständigen State laden (z.B. nach File Load - für Import-Funktion)
     */
    loadState(data) {
        // Preserve UI state
        const uiState = this.state.ui;

        this.state = {
            contacts: data.contacts || [],
            groups: data.groups || [],
            events: data.events || [],
            customFields: data.customFields || [],
            settings: data.settings || this.state.settings,
            history: data.history || [],
            ui: uiState
        };

        this.emit('state:loaded', this.state);
    }

    /**
     * State für Export vorbereiten
     */
    exportState() {
        return {
            version: '1.0.0',
            created: this.state.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            contacts: this.state.contacts,
            groups: this.state.groups,
            events: this.state.events,
            customFields: this.state.customFields,
            settings: this.state.settings,
            history: this.state.history
        };
    }

    /**
     * State zurücksetzen
     */
    reset() {
        const theme = this.state.settings.theme;

        this.state = {
            contacts: [],
            groups: [],
            events: [],
            customFields: [],
            settings: {
                theme,
                storageMode: 'server',
                defaultEmail: '',
                animationsEnabled: true
            },
            history: [],
            ui: {
                currentView: 'contacts',
                selectedContacts: new Set(),
                isLoading: false,
                isConnected: false
            }
        };

        this.emit('state:reset', this.state);
    }

    /**
     * Verbindungsstatus prüfen
     */
    isConnected() {
        return this.state.ui.isConnected;
    }

    /**
     * Ladezustand prüfen
     */
    isLoading() {
        return this.state.ui.isLoading;
    }
}

// Singleton instance
const appState = new AppState();
export default appState;
