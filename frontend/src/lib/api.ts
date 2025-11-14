// Helper per costruire URL delle API in base al .env (VITE_API_BASE_URL)
// Supporta path con o senza slash iniziale, ed evita doppi slash.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '';

export const apiUrl = (path: string) => {
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/+$/, '') : '';
  const cleaned = path.replace(/^\/+/, '');
  return base ? `${base}/${cleaned}` : `/${cleaned}`;
};