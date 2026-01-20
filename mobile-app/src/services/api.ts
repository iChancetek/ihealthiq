import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const { method = 'GET', body, headers = {} } = options;
  
  // Get auth token
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Set content type for POST/PUT requests
  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized - redirect to login
        await AsyncStorage.removeItem('authToken');
        throw new Error('401: Authentication failed');
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}