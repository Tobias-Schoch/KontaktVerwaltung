/**
 * Event Form Modal Component
 */

import eventService from '../services/event-service.js';
import groupService from '../services/group-service.js';
import contactService from '../services/contact-service.js';
import appState from '../state/app-state.js';
import { showToast } from '../utils/helpers.js';

export class EventForm {
    constructor() {
        this.mode = 'create'; // 'create' | 'edit'
        this.eventId = null;
        this.modalElement = null;
        this.selectedGroupIds = new Set();
        this.selectedContactIds = new Set();
    }

    /**
     * Modal öffnen
     */
    open(mode = 'create', eventId = null) {
        this.mode = mode;
        this.eventId = eventId;

        if (mode === 'edit' && eventId) {
            const event = eventService.get(eventId);
            if (event) {
                this.selectedGroupIds = new Set(event.attendees.groupIds);
                this.selectedContactIds = new Set(event.attendees.contactIds);
            }
        }

        this.render();
        this.attachEventListeners();

        // Modal anzeigen
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.add('active');

        // Focus auf erstes Feld
        setTimeout(() => {
            const firstInput = this.modalElement.querySelector('input');
            firstInput?.focus();
        }, 100);
    }

    /**
     * Modal schließen
     */
    close() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');

        setTimeout(() => {
            if (this.modalElement) {
                this.modalElement.remove();
                this.modalElement = null;
            }
        }, 200);
    }

    /**
     * Modal rendern
     */
    render() {
        const event = this.mode === 'edit' && this.eventId
            ? eventService.get(this.eventId)
            : null;

        const title = this.mode === 'create' ? 'Event erstellen' : 'Event bearbeiten';
        const groups = groupService.list();
        const contacts = contactService.list();

        // Aktuelles Datum als default
        const today = new Date().toISOString().split('T')[0];

        const modal = document.createElement('div');
        modal.className = 'modal modal--large';
        modal.innerHTML = `
            <div class="modal__header">
                <h2 class="modal__title">${title}</h2>
                <button class="modal__close" id="closeModalBtn" aria-label="Schließen">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>

            <form class="modal__body" id="eventForm">
                <div class="input-group">
                    <label class="input-label input-label--required">Name</label>
                    <input
                        type="text"
                        class="input"
                        name="name"
                        value="${event?.name || ''}"
                        placeholder="Teammeeting, Geburtstag, Konferenz..."
                        required
                        maxlength="200"
                    />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="input-group">
                        <label class="input-label input-label--required">Datum</label>
                        <input
                            type="date"
                            class="input"
                            name="eventDate"
                            value="${event?.eventDate?.split('T')[0] || today}"
                            required
                        />
                    </div>

                    <div class="input-group">
                        <label class="input-label">Ort</label>
                        <input
                            type="text"
                            class="input"
                            name="location"
                            value="${event?.location || ''}"
                            placeholder="München, Zoom, etc."
                        />
                    </div>
                </div>

                <div class="input-group">
                    <label class="input-label">Beschreibung</label>
                    <textarea
                        class="input textarea"
                        name="description"
                        placeholder="Details zum Event..."
                        rows="3"
                    >${event?.description || ''}</textarea>
                </div>

                <div class="event-form__attendees">
                    <h3 class="event-form__section-title">Teilnehmer</h3>

                    <div class="event-form__attendees-section">
                        <h4 class="text-sm font-medium mb-3">Gruppen</h4>
                        <div class="event-form__group-list">
                            ${groups.length === 0
                                ? '<p class="text-sm text-tertiary">Keine Gruppen vorhanden</p>'
                                : groups.map(group => `
                                    <label class="event-form__checkbox-item">
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            data-group-id="${group.id}"
                                            ${this.selectedGroupIds.has(group.id) ? 'checked' : ''}
                                        />
                                        <span
                                            class="event-form__group-dot"
                                            style="background-color: var(--group-color-${group.color})"
                                        ></span>
                                        <span class="event-form__label-text">${this.escapeHtml(group.name)}</span>
                                        <span class="event-form__member-count">(${group.contactIds.length})</span>
                                    </label>
                                `).join('')}
                        </div>
                    </div>

                    <div class="event-form__attendees-section">
                        <h4 class="text-sm font-medium mb-3">Zusätzliche Einzelpersonen</h4>
                        <div class="event-form__contact-search">
                            <input
                                type="search"
                                class="input input--sm"
                                id="contactSearch"
                                placeholder="Kontakt suchen..."
                            />
                        </div>
                        <div class="event-form__contact-list" id="contactList">
                            ${this.renderContactCheckboxes(contacts.slice(0, 10))}
                        </div>
                    </div>
                </div>
            </form>

            <div class="modal__footer">
                <button type="button" class="btn btn--ghost" id="cancelBtn">
                    Abbrechen
                </button>
                <button type="submit" class="btn btn--primary" id="saveBtn" form="eventForm">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 3L4 14L0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${this.mode === 'create' ? 'Erstellen' : 'Speichern'}
                </button>
            </div>
        `;

        const overlay = document.getElementById('modalOverlay');
        overlay.innerHTML = '';
        overlay.appendChild(modal);

        this.modalElement = modal;
    }

    /**
     * Contact Checkboxes rendern
     */
    renderContactCheckboxes(contacts) {
        if (contacts.length === 0) {
            return '<p class="text-sm text-tertiary">Keine Kontakte gefunden</p>';
        }

        return contacts.map(contact => {
            const fullName = `${contact.fields.firstName || ''} ${contact.fields.lastName || ''}`.trim() || 'Unbenannt';
            return `
                <label class="event-form__checkbox-item">
                    <input
                        type="checkbox"
                        class="checkbox"
                        data-contact-id="${contact.id}"
                        ${this.selectedContactIds.has(contact.id) ? 'checked' : ''}
                    />
                    <span class="event-form__label-text">${this.escapeHtml(fullName)}</span>
                    ${contact.fields.email ? `
                        <span class="event-form__contact-email">${this.escapeHtml(contact.fields.email)}</span>
                    ` : ''}
                </label>
            `;
        }).join('');
    }

    /**
     * Event Listeners
     */
    attachEventListeners() {
        // Close buttons
        const closeBtn = this.modalElement.querySelector('#closeModalBtn');
        const cancelBtn = this.modalElement.querySelector('#cancelBtn');

        closeBtn?.addEventListener('click', () => this.close());
        cancelBtn?.addEventListener('click', () => this.close());

        // Click außerhalb
        const overlay = document.getElementById('modalOverlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Group checkboxes
        this.modalElement.querySelectorAll('[data-group-id]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const groupId = e.target.dataset.groupId;
                if (e.target.checked) {
                    this.selectedGroupIds.add(groupId);
                } else {
                    this.selectedGroupIds.delete(groupId);
                }
            });
        });

        // Contact checkboxes
        this.modalElement.querySelectorAll('[data-contact-id]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const contactId = e.target.dataset.contactId;
                if (e.target.checked) {
                    this.selectedContactIds.add(contactId);
                } else {
                    this.selectedContactIds.delete(contactId);
                }
            });
        });

        // Contact Search
        const contactSearch = this.modalElement.querySelector('#contactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', (e) => {
                const query = e.target.value;
                const contacts = query
                    ? contactService.search(query)
                    : contactService.list();

                const contactList = this.modalElement.querySelector('#contactList');
                contactList.innerHTML = this.renderContactCheckboxes(contacts.slice(0, 20));

                // Re-attach listeners
                this.attachContactCheckboxListeners();
            });
        }

        // Form Submit
        const form = this.modalElement.querySelector('#eventForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(form);
        });

        // ESC Key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Re-attach Contact Checkbox Listeners (nach Search)
     */
    attachContactCheckboxListeners() {
        this.modalElement.querySelectorAll('[data-contact-id]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const contactId = e.target.dataset.contactId;
                if (e.target.checked) {
                    this.selectedContactIds.add(contactId);
                } else {
                    this.selectedContactIds.delete(contactId);
                }
            });
        });
    }

    /**
     * Form Submit Handler
     */
    handleSubmit(form) {
        const formData = new FormData(form);

        const data = {
            name: formData.get('name')?.trim() || '',
            description: formData.get('description')?.trim() || '',
            eventDate: formData.get('eventDate') || '',
            location: formData.get('location')?.trim() || '',
            attendees: {
                groupIds: [...this.selectedGroupIds],
                contactIds: [...this.selectedContactIds]
            }
        };

        try {
            if (this.mode === 'create') {
                eventService.create(data);
                showToast('Event erstellt', 'success');
            } else {
                eventService.update(this.eventId, data);
                showToast('Event aktualisiert', 'success');
            }

            this.close();
            appState.emit('events:changed');

        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showToast(error.message || 'Fehler beim Speichern', 'error');
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
    }
}
