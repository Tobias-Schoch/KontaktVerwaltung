/**
 * App State Manager - Observer Pattern
 * Zentraler State für die gesamte Anwendung
 */

// fileSystemService wird nach Initialisierung gesetzt
let fileSystemServiceInstance = null;

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
                storageMode: null // 'filesystem' | 'fallback'
            },
            history: [],
            ui: {
                currentView: 'contacts',
                selectedContacts: new Set(),
                isDirty: false
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
            if (source[key] instanceof Object && key in target) {
                output[key] = this.deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        }

        return output;
    }

    /**
     * Kontakte
     */
    getContacts() {
        return this.state.contacts;
    }

    addContact(contact) {
        this.state.contacts.push(contact);
        this.markDirty();
        this.emit('contacts:added', contact);
    }

    updateContact(contactId, updates) {
        const index = this.state.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            const oldContact = { ...this.state.contacts[index] };
            this.state.contacts[index] = { ...oldContact, ...updates, updatedAt: new Date().toISOString() };
            this.markDirty();
            this.emit('contacts:updated', { contact: this.state.contacts[index], oldContact });
        }
    }

    deleteContact(contactId) {
        const index = this.state.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            const deleted = this.state.contacts.splice(index, 1)[0];
            this.markDirty();
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
        this.markDirty();
        this.emit('groups:added', group);
    }

    updateGroup(groupId, updates) {
        const index = this.state.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            const oldGroup = { ...this.state.groups[index] };
            this.state.groups[index] = { ...oldGroup, ...updates, updatedAt: new Date().toISOString() };
            this.markDirty();
            this.emit('groups:updated', { group: this.state.groups[index], oldGroup });
        }
    }

    deleteGroup(groupId) {
        const index = this.state.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            const deleted = this.state.groups.splice(index, 1)[0];
            this.markDirty();
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
        this.markDirty();
        this.emit('events:added', event);
    }

    updateEvent(eventId, updates) {
        const index = this.state.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const oldEvent = { ...this.state.events[index] };
            this.state.events[index] = { ...oldEvent, ...updates, updatedAt: new Date().toISOString() };
            this.markDirty();
            this.emit('events:updated', { event: this.state.events[index], oldEvent });
        }
    }

    deleteEvent(eventId) {
        const index = this.state.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const deleted = this.state.events.splice(index, 1)[0];
            this.markDirty();
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
        this.markDirty();
        this.emit('customFields:added', field);
    }

    /**
     * Settings
     */
    getSettings() {
        return this.state.settings;
    }

    updateSettings(updates) {
        this.state.settings = { ...this.state.settings, ...updates };
        this.markDirty(); // Settings-Änderungen speichern
        this.emit('settings:updated', this.state.settings);
    }

    /**
     * Dirty State (ungespeicherte Änderungen)
     */
    markDirty() {
        console.log('🔄 markDirty() aufgerufen - starte Auto-Save');
        this.state.ui.isDirty = true;
        this.emit('state:dirty', true);

        // Auto-Save in IndexedDB nach jeder Änderung
        this.autoSaveToIndexedDB();
    }

    /**
     * FileSystemService Referenz setzen (wird von main.js aufgerufen)
     */
    setFileSystemService(service) {
        fileSystemServiceInstance = service;
    }

    /**
     * Automatisches Speichern in IndexedDB
     */
    async autoSaveToIndexedDB() {
        console.log('📝 autoSaveToIndexedDB() aufgerufen');

        if (!fileSystemServiceInstance) {
            console.error('❌ FileSystemService noch nicht initialisiert!');
            return;
        }

        console.log('✓ FileSystemService ist verfügbar, starte Speicherung...');

        try {
            const data = this.exportState();
            console.log('📦 Daten exportiert, Anzahl Kontakte:', data.contacts?.length || 0);

            await fileSystemServiceInstance.saveWorkingCopy(data);
            console.log('✅ Auto-Save in IndexedDB erfolgreich abgeschlossen!');
        } catch (error) {
            console.error('❌ Fehler beim Auto-Save:', error);
        }
    }

    markClean() {
        this.state.ui.isDirty = false;
        this.emit('state:dirty', false);
    }

    isDirty() {
        return this.state.ui.isDirty;
    }

    /**
     * Vollständigen State laden (z.B. nach File Load)
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

        this.markClean();
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
        const storageMode = this.state.settings.storageMode;

        this.state = {
            contacts: [],
            groups: [],
            events: [],
            customFields: [],
            settings: {
                theme,
                storageMode,
                defaultEmail: '',
                animationsEnabled: true
            },
            history: [],
            ui: {
                currentView: 'contacts',
                selectedContacts: new Set(),
                isDirty: false
            }
        };

        this.emit('state:reset', this.state);
    }
}

// Singleton instance
const appState = new AppState();
export default appState;
