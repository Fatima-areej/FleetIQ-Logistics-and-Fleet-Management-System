/*

Frontend Authentication System

This file defines the AuthContext and AuthProvider components,
which manage user authentication state across the Fleetiq frontend application.

*/

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();        //creates a global container that stores auth data (like user info and login/logout functions) 
// and allows any component in the app to access it without having to pass props down manually through every level of the component tree.


// AuthProvider is a component that wraps around the part of the app that needs access to authentication data. 
// It uses React's useState hook to manage the current user state and provides login and logout functions that can be called from anywhere in the app.

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');        //user stays logged in after app refresh
        return stored ? JSON.parse(stored) : null;
    });

    const login = (userData, token) => {
        localStorage.setItem('token', token);                       //stores jwt token
        localStorage.setItem('user', JSON.stringify(userData));     //stores user info
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);     //shortcut to access auth data and functions from anywhere
}