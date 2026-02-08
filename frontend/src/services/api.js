const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error("Missing VITE_API_URL environment variable. Please check your .env file.");
}

export const api = {
    /**
     * Get the initial graph data
     * @returns {Promise<{nodes: [], links: []}>}
     */
    getGraph: async () => {
        try {
            const response = await fetch(`${API_URL}/graph`);
            if (!response.ok) throw new Error('Failed to fetch graph');
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Search the graph with a query
     * @param {string} query 
     * @returns {Promise<{nodes: [], links: []}>}
     */
    search: async (query) => {
        try {
            const response = await fetch(`${API_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            if (!response.ok) throw new Error('Failed to search');
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Create a new user
     * @param {object} userData 
     */
    createUser: async (userData) => {
        try {
            const response = await fetch(`${API_URL}/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Login user
     * @param {string} email 
     * @param {string} password
     */
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to login');
            }
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Extract CV data
     * @param {File} file 
     */
    extractCV: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/cv/extract`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to extract CV');
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    updateUser: async (userData) => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/user`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(userData)
            });
            if (!response.ok) throw new Error('Failed to update user');
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /** 
     * Seed Database (Dev only)
     */
    seedDatabase: async () => {
        try {
            const response = await fetch(`${API_URL}/seed`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to seed database');
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
};

export const extractCV = api.extractCV;
