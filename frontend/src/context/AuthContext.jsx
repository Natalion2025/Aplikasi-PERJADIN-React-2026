import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Konfigurasi default axios untuk menyertakan cookie sesi pada setiap request
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            const response = await axios.get('/api/user/session');
            if (response.data && response.data.user) {
                setUser(response.data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await axios.post('/api/auth/login', { username, password });
            await checkSession(); // Muat ulang sesi setelah login sukses
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || 'Login gagal. Silakan coba lagi.';
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
            setUser(null);
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            setUser(null);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
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
