import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  const login = (userData, userToken) => {
    // _id ko id mein normalize karo — comparison ke liye
    const normalizedUser = {
      ...userData,
      id: userData.id || userData._id,
    };
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(userToken);
    setUser(normalizedUser);
  };

  // ✅ Naya — sirf user update karo, token same rahe
  const updateUser = (updatedData) => {
    const merged = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};