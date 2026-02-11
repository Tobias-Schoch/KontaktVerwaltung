/**
 * Helper Utilities
 */

/**
 * UUID Generator
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Initials für Avatar generieren
 */
export function getInitials(firstName = '', lastName = '') {
    const first = firstName.trim().charAt(0).toUpperCase();
    const last = lastName.trim().charAt(0).toUpperCase();
    return first + last || '?';
}

/**
 * Formatiere Datum
 */
export function formatDate(dateString, format = 'short') {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (format === 'short') {
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    if (format === 'long') {
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    if (format === 'time') {
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return date.toLocaleDateString('de-DE');
}

/**
 * Debounce Funktion
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle Funktion
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Escape HTML
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Email Validierung
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Telefon Formatierung
 */
export function formatPhone(phone) {
    if (!phone) return '';
    // Einfache Formatierung - kann erweitert werden
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
}

/**
 * Toast Notification anzeigen
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
        success: `<svg class="toast__icon" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/></svg>`,
        error: `<svg class="toast__icon" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/></svg>`,
        warning: `<svg class="toast__icon" viewBox="0 0 20 20" fill="none"><path d="M1 17L10 1L19 17H1ZM11 14H9V12H11V14ZM11 10H9V6H11V10Z" fill="currentColor"/></svg>`,
        info: `<svg class="toast__icon" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="currentColor"/></svg>`
    };

    toast.innerHTML = `
        ${icons[type] || icons.info}
        <div class="toast__content">
            <div class="toast__message">${escapeHtml(message)}</div>
        </div>
        <button class="toast__close" aria-label="Schließen">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;

    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.onclick = () => toast.remove();

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'fadeOut 200ms ease-out forwards';
            setTimeout(() => toast.remove(), 200);
        }, duration);
    }
}

/**
 * Bestätigungs-Dialog
 */
export function confirm(message, title = 'Bestätigung') {
    return new Promise((resolve) => {
        // TODO: Implementiere schönen Custom-Dialog
        // Für jetzt: Native confirm
        resolve(window.confirm(`${title}\n\n${message}`));
    });
}

/**
 * Copy to Clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('In Zwischenablage kopiert', 'success', 2000);
        return true;
    } catch (error) {
        console.error('Clipboard-Fehler:', error);
        showToast('Kopieren fehlgeschlagen', 'error');
        return false;
    }
}

/**
 * Prüfe ob Element im Viewport ist
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Smooth Scroll zu Element
 */
export function scrollToElement(element, offset = 0) {
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
        top,
        behavior: 'smooth'
    });
}

/**
 * Get Group Color
 */
export function getGroupColor(colorName) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(`--group-color-${colorName}`)
        .trim();
}
