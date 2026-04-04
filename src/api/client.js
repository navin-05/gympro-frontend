import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔥 PRODUCTION API (Render)
const API_BASE_URL = 'https://gympro-backend-1.onrender.com/api';

// 🔥 DEBUG (VERY IMPORTANT)
console.log('[API] Using Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // ⏳ increased for Render cold start
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Attach auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log('[API REQUEST]', config.method?.toUpperCase(), config.url);
    } catch (error) {
      console.log('[API] Token read error:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle responses
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API RESPONSE]', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.log('[API ERROR]', error.message);

    if (error.response) {
      console.log('[API ERROR STATUS]', error.response.status);

      if (error.response.status === 401) {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
      }
    } else {
      console.log('[API ERROR]', 'No response from server (Network issue)');
    }

    return Promise.reject(error);
  }
);

export default apiClient;