/**
 * Entorno de DESARROLLO.
 *
 * Todas las peticiones al backend y al proxy de football-data.org
 * pasan por el proxy del Angular Dev Server (proxy.conf.json):
 *   /api  → http://localhost:8080/api
 *
 * Sustitución automática: en `ng build --configuration production`
 * Angular reemplaza este fichero por environment.prod.ts.
 */
export const environment = {
  production: false,
  /** Base URL para la API del backend CoachLab. */
  apiBase: '/api',
  /**
   * Base URL para el proxy de football-data.org servido por el backend.
   * En producción, Nginx enruta /api/fd → backend → football-data.org.
   */
  fdApiBase: '/api/fd',
} as const;
