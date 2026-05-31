import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('toyworld_token');
    if (token) {
      authApi.getMe()
        .then(data => setUser({ ...data, avatar: '👤' }))
        .catch(() => localStorage.removeItem('toyworld_token'))
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('toyworld_token', data.accessToken);
      
      const profileData = await authApi.getMe();
      setUser({ ...profileData, avatar: '👤' });
      return { ok: true, role: profileData.role };
    } catch (err) { return { ok: false, error: err.message }; }
  };

  const register = async (formData) => {
    try {
      const payload = { ...formData, fullName: formData.name };
      delete payload.name;
      const data = await authApi.register(payload);
      localStorage.setItem('toyworld_token', data.accessToken);
      
      const profileData = await authApi.getMe();
      setUser({ ...profileData, avatar: '👤' });
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  };

  const logout = () => { localStorage.removeItem('toyworld_token'); setUser(null); };
  const updateProfile = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

