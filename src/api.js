import axios from 'axios';

// In production the frontend calls /api on its own domain. vercel.json forwards
// those calls to the Render backend, so the login cookie stays first-party and
// is not blocked by browsers. Locally it talks to the backend directly.
// VITE_API_URL can override this if you ever need to.
const baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:3001');

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true,
  timeout: 60000, // Render free servers can take up to a minute to wake up
});

export default api;
