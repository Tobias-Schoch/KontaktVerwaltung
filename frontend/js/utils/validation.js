/**
 * Validation Utilities
 */

/**
 * Contact Validation
 */
export function validateContact(contact) {
    const errors = {};

    // Mindestens ein Name ist erforderlich
    if (!contact.fields?.firstName && !contact.fields?.lastName) {
        errors.name = 'Vor- oder Nachname ist erforderlich';
    }

    // Email validieren (wenn vorhanden)
    if (contact.fields?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact.fields.email)) {
            errors.email = 'Ungültige E-Mail-Adresse';
        }
    }

    // Telefon validieren (wenn vorhanden)
    if (contact.fields?.phone) {
        const phoneRegex = /^[\d\s\+\-\(\)]+$/;
        if (!phoneRegex.test(contact.fields.phone)) {
            errors.phone = 'Ungültige Telefonnummer';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Group Validation
 */
export function validateGroup(group) {
    const errors = {};

    if (!group.name || group.name.trim().length === 0) {
        errors.name = 'Name ist erforderlich';
    }

    if (group.name && group.name.length > 100) {
        errors.name = 'Name ist zu lang (max. 100 Zeichen)';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Event Validation
 */
export function validateEvent(event) {
    const errors = {};

    if (!event.name || event.name.trim().length === 0) {
        errors.name = 'Name ist erforderlich';
    }

    if (!event.eventDate) {
        errors.eventDate = 'Datum ist erforderlich';
    }

    // Prüfe ob Datum in der Vergangenheit liegt (optional, als Warnung)
    if (event.eventDate) {
        const eventDate = new Date(event.eventDate);
        const now = new Date();
        if (eventDate < now) {
            errors.eventDateWarning = 'Das Event liegt in der Vergangenheit';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Custom Field Validation
 */
export function validateCustomField(field) {
    const errors = {};

    if (!field.name || field.name.trim().length === 0) {
        errors.name = 'Name ist erforderlich';
    }

    if (!field.type) {
        errors.type = 'Typ ist erforderlich';
    }

    const validTypes = ['text', 'email', 'phone', 'date', 'number', 'textarea'];
    if (field.type && !validTypes.includes(field.type)) {
        errors.type = 'Ungültiger Typ';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Field Value Validation basierend auf Type
 */
export function validateFieldValue(value, fieldType, required = false) {
    if (required && (!value || value.trim().length === 0)) {
        return { isValid: false, error: 'Feld ist erforderlich' };
    }

    if (!value || value.trim().length === 0) {
        return { isValid: true };
    }

    switch (fieldType) {
        case 'email': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { isValid: false, error: 'Ungültige E-Mail-Adresse' };
            }
            break;
        }
        case 'phone': {
            const phoneRegex = /^[\d\s\+\-\(\)]+$/;
            if (!phoneRegex.test(value)) {
                return { isValid: false, error: 'Ungültige Telefonnummer' };
            }
            break;
        }
        case 'number': {
            if (isNaN(value)) {
                return { isValid: false, error: 'Muss eine Zahl sein' };
            }
            break;
        }
        case 'date': {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { isValid: false, error: 'Ungültiges Datum' };
            }
            break;
        }
    }

    return { isValid: true };
}
