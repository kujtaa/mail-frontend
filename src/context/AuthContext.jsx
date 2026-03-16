import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, clearToken, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('token');
    if (stored) {
      setToken(stored);
      api.get('/auth/me')
        .then(setCompany)
        .catch(() => {
          clearToken();
          sessionStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.access_token);
    sessionStorage.setItem('token', data.access_token);
    setCompany(data.company);
    return data.company;
  };

  const register = async (company_name, email, password) => {
    const data = await api.post('/auth/register', { company_name, email, password });
    setToken(data.access_token);
    sessionStorage.setItem('token', data.access_token);
    const profile = await api.get('/auth/me');
    setCompany(profile);
    return profile;
  };

  const logout = () => {
    clearToken();
    sessionStorage.removeItem('token');
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ company, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
