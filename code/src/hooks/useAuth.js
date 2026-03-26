import { useState, useEffect } from 'react';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in by checking localStorage or making API call
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Failed to parse user data:', error);
                setUser(null);
            }
        }
        
        setLoading(false);
    }, []);

    return { user, loading };
}
