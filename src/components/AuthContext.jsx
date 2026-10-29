import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext();

function getErrorMessage(error) {
    if (error.response && error.response.data && error.response.data.message) {
        return error.response.data.message;
    }
    if (error.code === 'ECONNABORTED') {
        return 'The server took too long to respond. Please try again.';
    }
    return 'Cannot reach the server. Please check your connection and try again.';
}

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // register, login and logout return an error message, or null when it worked.
    async function register(name, email, password, confirmPassword) {
        try {
            const response = await api.post('/register', { name, email, password, confirmPassword });
            setUser(response.data.user);
            return null;
        } catch (error) {
            console.error('Registration error:', error);
            return getErrorMessage(error);
        }
    }

    async function login(email, password) {
        try {
            const response = await api.post('/login', { email, password });
            setUser(response.data.user);
            return null;
        } catch (error) {
            console.error('Login error:', error);
            return getErrorMessage(error);
        }
    }

    async function logout() {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, setUser, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    return useContext(AuthContext);
}

export { AuthProvider, useAuth };
