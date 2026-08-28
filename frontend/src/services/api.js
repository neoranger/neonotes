const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('neonotes_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('neonotes_token', token);
  } else {
    localStorage.removeItem('neonotes_token');
  }
}

export async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await res.json();
    if (!res.ok) {
      const error = new Error(result.error || 'Error en la petición API');
      error.status = res.status;
      throw error;
    }
    return result;
  } catch (error) {
    console.warn(`Petición API falló (${endpoint}):`, error.message);
    throw error;
  }
}
