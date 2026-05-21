/**
 * Entorno de PRODUCCIÓN.
 *
 * En producción, Nginx sirve la SPA y actúa como proxy inverso:
 *   /api  → http://backend:8080/api   (Docker Compose internal network)
 *
 * El frontend nunca llama directamente a football-data.org.
 * Todas las peticiones FD pasan por /api/fd → backend → football-data.org.
 */
export const environment = {
  production: true,
  /** Base URL para la API del backend CoachLab. */
  apiBase: '/api',
  /**
   * Base URL para el proxy de football-data.org servido por el backend.
   * Nginx enruta /api/fd → backend → football-data.org.
   */
  fdApiBase: '/api/fd',
} as const;
