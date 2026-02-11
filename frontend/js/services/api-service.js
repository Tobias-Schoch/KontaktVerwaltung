/**
 * API Service - HTTP Client for Backend Communication
 */

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);

    // Handle no content response
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Request failed',
        response.status,
        data.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or JSON parse error
    throw new ApiError(
      error.message || 'Network error',
      0,
      null
    );
  }
}

/**
 * Contacts API
 */
export const contactsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/contacts${query ? '?' + query : ''}`);
  },

  get: (id) => request(`/contacts/${id}`),

  create: (data) => request('/contacts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  update: (id, data) => request(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  delete: (id) => request(`/contacts/${id}`, {
    method: 'DELETE'
  })
};

/**
 * Groups API
 */
export const groupsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/groups${query ? '?' + query : ''}`);
  },

  get: (id) => request(`/groups/${id}`),

  create: (data) => request('/groups', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  update: (id, data) => request(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  delete: (id) => request(`/groups/${id}`, {
    method: 'DELETE'
  }),

  addContact: (groupId, contactId) => request(`/groups/${groupId}/contacts/${contactId}`, {
    method: 'POST'
  }),

  removeContact: (groupId, contactId) => request(`/groups/${groupId}/contacts/${contactId}`, {
    method: 'DELETE'
  })
};

/**
 * Events API
 */
export const eventsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/events${query ? '?' + query : ''}`);
  },

  get: (id) => request(`/events/${id}`),

  create: (data) => request('/events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  update: (id, data) => request(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  delete: (id) => request(`/events/${id}`, {
    method: 'DELETE'
  }),

  addGroup: (eventId, groupId) => request(`/events/${eventId}/groups/${groupId}`, {
    method: 'POST'
  }),

  removeGroup: (eventId, groupId) => request(`/events/${eventId}/groups/${groupId}`, {
    method: 'DELETE'
  }),

  addContact: (eventId, contactId) => request(`/events/${eventId}/contacts/${contactId}`, {
    method: 'POST'
  }),

  removeContact: (eventId, contactId) => request(`/events/${eventId}/contacts/${contactId}`, {
    method: 'DELETE'
  })
};

/**
 * Settings API
 */
export const settingsApi = {
  get: () => request('/settings'),

  update: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  getSingle: (key) => request(`/settings/${key}`)
};

/**
 * Health check
 */
export const healthApi = {
  check: () => request('/health')
};

export { ApiError };
