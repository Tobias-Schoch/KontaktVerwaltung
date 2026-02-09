/**
 * Contact Form Modal Component
 */

import contactService from '../services/contact-service.js';
import appState from '../state/app-state.js';
import { showToast } from '../utils/helpers.js';
import { validateContact } from '../utils/validation.js';

export class ContactForm {
    constructor() {
        this.mode = 'create'; // 'create' | 'edit'
        this.contactId = null;
        this.modalElement = null;
    }

    /**
     * Modal öffnen
     */
    open(mode = 'create', contactId = null) {
        this.mode = mode;
        this.contactId = contactId;

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
        const contact = this.mode === 'edit' && this.contactId
            ? contactService.get(this.contactId)
            : null;

        const title = this.mode === 'create' ? 'Kontakt hinzufügen' : 'Kontakt bearbeiten';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__header">
                <h2 class="modal__title">${title}</h2>
                <button class="modal__close" id="closeModalBtn" aria-label="Schließen">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>

            <form class="modal__body" id="contactForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="input-group">
                        <label class="input-label input-label--required">Vorname</label>
                        <input
                            type="text"
                            class="input"
                            name="firstName"
                            value="${contact?.fields.firstName || ''}"
                            placeholder="Max"
                            required
                        />
                    </div>

                    <div class="input-group">
                        <label class="input-label input-label--required">Nachname</label>
                        <input
                            type="text"
                            class="input"
                            name="lastName"
                            value="${contact?.fields.lastName || ''}"
                            placeholder="Mustermann"
                            required
                        />
                    </div>
                </div>

                <div class="input-group">
                    <label class="input-label">E-Mail</label>
                    <input
                        type="email"
                        class="input"
                        name="email"
                        value="${contact?.fields.email || ''}"
                        placeholder="max@example.com"
                    />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="input-group">
                        <label class="input-label">Telefon</label>
                        <input
                            type="tel"
                            class="input"
                            name="phone"
                            value="${contact?.fields.phone || ''}"
                            placeholder="+49 123 456789"
                        />
                    </div>

                    <div class="input-group">
                        <label class="input-label">Mobil</label>
                        <input
                            type="tel"
                            class="input"
                            name="mobile"
                            value="${contact?.fields.mobile || ''}"
                            placeholder="+49 170 1234567"
                        />
                    </div>
                </div>

                <div class="input-group">
                    <label class="input-label">Firma</label>
                    <input
                        type="text"
                        class="input"
                        name="company"
                        value="${contact?.fields.company || ''}"
                        placeholder="Musterfirma GmbH"
                    />
                </div>

                <div class="input-group">
                    <label class="input-label">Adresse</label>
                    <input
                        type="text"
                        class="input"
                        name="street"
                        value="${contact?.fields.address?.street || ''}"
                        placeholder="Musterstraße 1"
                        style="margin-bottom: 0.5rem;"
                    />
                    <div style="display: grid; grid-template-columns: 100px 1fr 1fr; gap: 0.5rem;">
                        <input
                            type="text"
                            class="input"
                            name="zip"
                            value="${contact?.fields.address?.zip || ''}"
                            placeholder="12345"
                        />
                        <input
                            type="text"
                            class="input"
                            name="city"
                            value="${contact?.fields.address?.city || ''}"
                            placeholder="Stadt"
                        />
                        <input
                            type="text"
                            class="input"
                            name="country"
                            value="${contact?.fields.address?.country || ''}"
                            placeholder="Deutschland"
                        />
                    </div>
                </div>

                <div class="input-group">
                    <label class="input-label">Notizen</label>
                    <textarea
                        class="input textarea"
                        name="notes"
                        placeholder="Zusätzliche Informationen..."
                        rows="3"
                    >${contact?.fields.notes || ''}</textarea>
                </div>

                <div class="input-group">
                    <label class="input-label">Tags</label>
                    <input
                        type="text"
                        class="input"
                        name="tags"
                        value="${contact?.tags?.join(', ') || ''}"
                        placeholder="vip, kunde, partner (kommagetrennt)"
                    />
                    <small class="input-helper">Mehrere Tags mit Komma trennen</small>
                </div>
            </form>

            <div class="modal__footer">
                <button type="button" class="btn btn--ghost" id="cancelBtn">
                    Abbrechen
                </button>
                <button type="submit" class="btn btn--primary" id="saveBtn" form="contactForm">
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
     * Event Listeners
     */
    attachEventListeners() {
        // Close buttons
        const closeBtn = this.modalElement.querySelector('#closeModalBtn');
        const cancelBtn = this.modalElement.querySelector('#cancelBtn');

        closeBtn?.addEventListener('click', () => this.close());
        cancelBtn?.addEventListener('click', () => this.close());

        // Click außerhalb des Modals
        const overlay = document.getElementById('modalOverlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Form Submit
        const form = this.modalElement.querySelector('#contactForm');
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
     * Form Submit Handler
     */
    handleSubmit(form) {
        const formData = new FormData(form);

        const data = {
            fields: {
                firstName: formData.get('firstName')?.trim() || '',
                lastName: formData.get('lastName')?.trim() || '',
                email: formData.get('email')?.trim() || '',
                phone: formData.get('phone')?.trim() || '',
                mobile: formData.get('mobile')?.trim() || '',
                company: formData.get('company')?.trim() || '',
                address: {
                    street: formData.get('street')?.trim() || '',
                    city: formData.get('city')?.trim() || '',
                    zip: formData.get('zip')?.trim() || '',
                    country: formData.get('country')?.trim() || ''
                },
                notes: formData.get('notes')?.trim() || ''
            },
            tags: formData.get('tags')
                ? formData.get('tags').split(',').map(t => t.trim()).filter(Boolean)
                : []
        };

        try {
            if (this.mode === 'create') {
                contactService.create(data);
                showToast('Kontakt erstellt', 'success');
            } else {
                contactService.update(this.contactId, data);
                showToast('Kontakt aktualisiert', 'success');
            }

            // Modal schließen und View neu laden
            this.close();

            // Event für View-Refresh
            appState.emit('contacts:changed');

        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showToast(error.message || 'Fehler beim Speichern', 'error');
        }
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
