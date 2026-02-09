/**
 * Group Form Modal Component
 */

import groupService from '../services/group-service.js';
import appState from '../state/app-state.js';
import { showToast } from '../utils/helpers.js';

export class GroupForm {
    constructor() {
        this.mode = 'create'; // 'create' | 'edit'
        this.groupId = null;
        this.modalElement = null;
    }

    /**
     * Modal öffnen
     */
    open(mode = 'create', groupId = null) {
        this.mode = mode;
        this.groupId = groupId;

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
        const group = this.mode === 'edit' && this.groupId
            ? groupService.get(this.groupId)
            : null;

        const title = this.mode === 'create' ? 'Gruppe erstellen' : 'Gruppe bearbeiten';
        const colors = groupService.getAvailableColors();
        const selectedColor = group?.color || 'blue';

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

            <form class="modal__body" id="groupForm">
                <div class="input-group">
                    <label class="input-label input-label--required">Name</label>
                    <input
                        type="text"
                        class="input"
                        name="name"
                        value="${group?.name || ''}"
                        placeholder="Familie, Freunde, Arbeit..."
                        required
                        maxlength="100"
                    />
                </div>

                <div class="input-group">
                    <label class="input-label">Beschreibung</label>
                    <textarea
                        class="input textarea"
                        name="description"
                        placeholder="Optionale Beschreibung..."
                        rows="3"
                    >${group?.description || ''}</textarea>
                </div>

                <div class="input-group">
                    <label class="input-label">Farbe</label>
                    <div class="color-picker">
                        ${colors.map(color => `
                            <label class="color-picker__option">
                                <input
                                    type="radio"
                                    name="color"
                                    value="${color.name}"
                                    ${color.name === selectedColor ? 'checked' : ''}
                                />
                                <span
                                    class="color-picker__swatch"
                                    style="background-color: var(--group-color-${color.name})"
                                    title="${color.label}"
                                ></span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </form>

            <div class="modal__footer">
                <button type="button" class="btn btn--ghost" id="cancelBtn">
                    Abbrechen
                </button>
                <button type="submit" class="btn btn--primary" id="saveBtn" form="groupForm">
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
        const form = this.modalElement.querySelector('#groupForm');
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
            name: formData.get('name')?.trim() || '',
            description: formData.get('description')?.trim() || '',
            color: formData.get('color') || 'blue'
        };

        try {
            if (this.mode === 'create') {
                groupService.create(data);
                showToast('Gruppe erstellt', 'success');
            } else {
                groupService.update(this.groupId, data);
                showToast('Gruppe aktualisiert', 'success');
            }

            // Modal schließen und View neu laden
            this.close();

            // Event für View-Refresh
            appState.emit('groups:changed');

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
