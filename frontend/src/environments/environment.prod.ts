/**
 * Entorno de PRODUCCIÓN (Render).
 *
 * Angular llama directamente al backend por su URL pública.
 * CORS está configurado en Spring Boot para permitir este origen.
 */
export const environment = {
  production: true,
  apiBase: 'https://coachlab-futbol.onrender.com/api',
  fdApiBase: 'https://coachlab-futbol.onrender.com/api/fd',
} as const;
