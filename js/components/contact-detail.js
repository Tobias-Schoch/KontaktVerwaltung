/**
 * Contact Detail View Component
 */

import contactService from '../services/contact-service.js';
import appState from '../state/app-state.js';
import { showToast, copyToClipboard, formatDate } from '../utils/helpers.js';
import { ContactForm } from './contact-form.js';

export class ContactDetail {
    constructor(contactId) {
        this.contactId = contactId;
        this.contact = null;
        this.panelElement = null;
    }

    /**
     * Panel öffnen
     */
    open() {
        this.contact = contactService.get(this.contactId);

        if (!this.contact) {
            showToast('Kontakt nicht gefunden', 'error');
            return;
        }

        this.render();
        this.attachEventListeners();
    }

    /**
     * Panel schließen
     */
    close() {
        if (this.panelElement) {
            this.panelElement.style.animation = 'slideOutRight 250ms ease-out forwards';
            setTimeout(() => {
                this.panelElement?.remove();
                this.panelElement = null;
            }, 250);
        }
    }

    /**
     * Panel rendern
     */
    render() {
        // Bestehende Panel entfernen
        const existing = document.querySelector('.contact-detail-panel');
        if (existing) {
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.className = 'contact-detail-panel';
        panel.innerHTML = this.renderContent();

        document.body.appendChild(panel);
        this.panelElement = panel;

        // Animation starten
        setTimeout(() => {
            panel.style.transform = 'translateX(0)';
        }, 10);
    }

    /**
     * Content rendern
     */
    renderContent() {
        const contact = this.contact;
        const initials = this.getInitials(contact.fields.firstName, contact.fields.lastName);
        const fullName = contact.getFullName();
        const groups = this.getContactGroups();

        return `
            <div class="contact-detail__header">
                <button class="icon-button" id="closeDetailBtn" aria-label="Schließen">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <h2 class="contact-detail__title">Kontakt Details</h2>
                <div class="contact-detail__actions">
                    <button class="icon-button" id="editContactBtn" aria-label="Bearbeiten" title="Bearbeiten">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-button" id="deleteContactBtn" aria-label="Löschen" title="Löschen">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 5H17M8 5V3H12V5M8 9V15M12 9V15M5 5L6 17H14L15 5H5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="contact-detail__body">
                <div class="contact-detail__avatar-large">${initials}</div>
                <h3 class="contact-detail__name">${this.escapeHtml(fullName)}</h3>

                ${contact.fields.company ? `
                    <div class="contact-detail__company">${this.escapeHtml(contact.fields.company)}</div>
                ` : ''}

                <div class="contact-detail__section">
                    ${contact.fields.email ? `
                        <div class="contact-detail__field">
                            <div class="contact-detail__field-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4L8 9L14 4M2 4V12H14V4H2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                E-Mail
                            </div>
                            <div class="contact-detail__field-value">
                                <a href="mailto:${this.escapeHtml(contact.fields.email)}" class="contact-detail__link">
                                    ${this.escapeHtml(contact.fields.email)}
                                </a>
                                <button class="contact-detail__copy-btn" data-copy="${this.escapeHtml(contact.fields.email)}" title="Kopieren">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M5 5V2H13V10H10M1 6H9V14H1V6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    ${contact.fields.phone ? `
                        <div class="contact-detail__field">
                            <div class="contact-detail__field-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 2H6L8 6L6 7C6 9 7 10 9 10L10 8L14 10V14C14 14 9 15 5 11C1 7 2 2 2 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Telefon
                            </div>
                            <div class="contact-detail__field-value">
                                <a href="tel:${this.escapeHtml(contact.fields.phone)}" class="contact-detail__link">
                                    ${this.escapeHtml(contact.fields.phone)}
                                </a>
                            </div>
                        </div>
                    ` : ''}

                    ${contact.fields.mobile ? `
                        <div class="contact-detail__field">
                            <div class="contact-detail__field-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect x="4" y="1" width="8" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M7 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                Mobil
                            </div>
                            <div class="contact-detail__field-value">
                                <a href="tel:${this.escapeHtml(contact.fields.mobile)}" class="contact-detail__link">
                                    ${this.escapeHtml(contact.fields.mobile)}
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>

                ${this.hasAddress(contact) ? `
                    <div class="contact-detail__section">
                        <h4 class="contact-detail__section-title">Adresse</h4>
                        <div class="contact-detail__address">
                            ${contact.fields.address.street ? `${this.escapeHtml(contact.fields.address.street)}<br>` : ''}
                            ${contact.fields.address.zip || contact.fields.address.city ? `
                                ${this.escapeHtml(contact.fields.address.zip)} ${this.escapeHtml(contact.fields.address.city)}<br>
                            ` : ''}
                            ${contact.fields.address.country ? this.escapeHtml(contact.fields.address.country) : ''}
                        </div>
                    </div>
                ` : ''}

                ${contact.fields.notes ? `
                    <div class="contact-detail__section">
                        <h4 class="contact-detail__section-title">Notizen</h4>
                        <div class="contact-detail__notes">${this.escapeHtml(contact.fields.notes)}</div>
                    </div>
                ` : ''}

                ${contact.tags && contact.tags.length > 0 ? `
                    <div class="contact-detail__section">
                        <h4 class="contact-detail__section-title">Tags</h4>
                        <div class="contact-detail__tags">
                            ${contact.tags.map(tag => `
                                <span class="contact-detail__tag">${this.escapeHtml(tag)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${groups.length > 0 ? `
                    <div class="contact-detail__section">
                        <h4 class="contact-detail__section-title">Gruppen</h4>
                        <div class="contact-detail__groups">
                            ${groups.map(group => `
                                <div class="contact-detail__group" style="border-left: 3px solid var(--group-color-${group.color})">
                                    ${this.escapeHtml(group.name)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="contact-detail__section">
                    <div class="contact-detail__meta">
                        <small>Erstellt: ${formatDate(contact.createdAt, 'time')}</small>
                        <small>Aktualisiert: ${formatDate(contact.updatedAt, 'time')}</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Event Listeners
     */
    attachEventListeners() {
        // Close
        const closeBtn = this.panelElement.querySelector('#closeDetailBtn');
        closeBtn?.addEventListener('click', () => this.close());

        // Edit
        const editBtn = this.panelElement.querySelector('#editContactBtn');
        editBtn?.addEventListener('click', () => {
            this.close();
            const form = new ContactForm();
            form.open('edit', this.contactId);
        });

        // Delete
        const deleteBtn = this.panelElement.querySelector('#deleteContactBtn');
        deleteBtn?.addEventListener('click', () => this.handleDelete());

        // Copy buttons
        this.panelElement.querySelectorAll('.contact-detail__copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.dataset.copy;
                copyToClipboard(text);
            });
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
     * Delete Handler
     */
    async handleDelete() {
        const confirmed = confirm(`Kontakt "${this.contact.getFullName()}" wirklich löschen?`);

        if (confirmed) {
            try {
                contactService.delete(this.contactId);
                showToast('Kontakt gelöscht', 'success');
                this.close();
                appState.emit('contacts:changed');
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }
    }

    /**
     * Helper: Gruppen des Kontakts
     */
    getContactGroups() {
        const groups = appState.getGroups();
        return groups.filter(g => g.contactIds.includes(this.contactId));
    }

    /**
     * Helper: Hat Adresse?
     */
    hasAddress(contact) {
        const addr = contact.fields.address;
        return addr && (addr.street || addr.city || addr.zip || addr.country);
    }

    /**
     * Helper: Initials
     */
    getInitials(firstName, lastName) {
        const first = firstName?.trim().charAt(0).toUpperCase() || '';
        const last = lastName?.trim().charAt(0).toUpperCase() || '';
        return first + last || '?';
    }

    /**
     * Helper: Escape HTML
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
