import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// CSRF cookie must be fetched before login/register
export async function getCsrfCookie(): Promise<void> {
  await api.get('/sanctum/csrf-cookie');
}

export default api;
