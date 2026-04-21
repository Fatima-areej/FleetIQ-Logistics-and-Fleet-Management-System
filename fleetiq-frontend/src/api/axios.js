/*

Fleetiq frontend will import this file whenever it needs to make an API call to the backend.

This file creates an Axios instance with a base URL of http://localhost:5000/api, which is where our backend server is running. 
It also sets up an interceptor to automatically attach the JWT token from localStorage to the Authorization header of every request.

*/

import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// automatically attach token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;