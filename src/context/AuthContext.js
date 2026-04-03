import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    console.log('[Auth] Initializing — loading stored auth...');
    loadStoredAuth().catch((err) => {
      console.log('[Auth] loadStoredAuth failed:', err);
      setIsLoading(false);
    });
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');
      console.log('[Auth] Stored token exists:', !!storedToken);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        console.log('[Auth] Restored session for:', parsedUser.name);

        // Verify profile status from backend (source of truth)
        try {
          const meRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const profileComplete = meRes.data?.isProfileComplete || false;
          console.log('[Auth] Backend profile check — isProfileComplete:', profileComplete);
          setIsProfileComplete(profileComplete);
          await AsyncStorage.setItem('isProfileComplete', String(profileComplete));
        } catch (verifyErr) {
          console.log('[Auth] Backend verify failed, using cached value:', verifyErr.message);
          const cached = await AsyncStorage.getItem('isProfileComplete');
          setIsProfileComplete(cached === 'true');
        }
      } else {
        console.log('[Auth] No stored session found');
      }
    } catch (error) {
      console.log('[Auth] Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name, gymName, mobile, email, password) => {
    console.log('[Auth] Signup attempt for:', email);
    try {
      const response = await apiClient.post('/auth/signup', {
        name, gymName, mobile, email, password,
      });
      console.log('[Auth] Signup response status:', response.status);
      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Signup failed';
      console.log('[Auth] Signup error:', errMsg);
      return { success: false, error: errMsg };
    }
  };

  const login = async (email, password) => {
    console.log('[Auth] Login attempt for:', email);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const data = response.data;

      if (!data || !data.token) {
        console.log('[Auth] Login response missing token!');
        return { success: false, error: 'Server response missing token' };
      }

      const authToken = data.token;
      const userData = data.user || { email };
      const profileComplete = data.isProfileComplete === true;

      console.log('[Auth] Login success — isProfileComplete:', profileComplete);

      // Store to AsyncStorage
      try {
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('isProfileComplete', String(profileComplete));
      } catch (storageErr) {
        console.log('[Auth] AsyncStorage write error (non-fatal):', storageErr);
      }

      // Update state
      setUser(userData);
      setToken(authToken);
      setIsProfileComplete(profileComplete);

      return { success: true, isProfileComplete: profileComplete };
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Login failed';
      console.log('[Auth] Login error:', errMsg);
      return { success: false, error: errMsg };
    }
  };

  const completeProfile = async () => {
    console.log('[Auth] Marking profile as complete');
    setIsProfileComplete(true);
    try {
      await AsyncStorage.setItem('isProfileComplete', 'true');
    } catch (e) {
      console.log('[Auth] AsyncStorage write error:', e);
    }
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.log('[Auth] Logout API error (continuing):', error.message);
    }
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('isProfileComplete');
    } catch (error) {
      console.log('[Auth] AsyncStorage clear error:', error);
    }
    setToken(null);
    setUser(null);
    setIsProfileComplete(false);
    console.log('[Auth] Logged out');
  };

  const resetPassword = async (email, newPassword) => {
    console.log('[Auth] Reset password for:', email);
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email, newPassword,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Reset failed';
      return { success: false, error: errMsg };
    }
  };

  console.log('[Auth] Render — isLoading:', isLoading, '| auth:', !!token, '| profile:', isProfileComplete);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        isProfileComplete,
        signup,
        login,
        logout,
        resetPassword,
        completeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
