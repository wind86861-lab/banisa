import axios from 'axios';

/**
 * Public API client - no authentication required
 * Used for endpoints that don't need auth like /api/public/*
 */
const publicApi = axios.create({
  baseURL: '/api',
  withCredentials: false, // no cookies needed for public endpoints
  timeout: 25000, // flaky Mini App networking — never hang forever
});

export default publicApi;
