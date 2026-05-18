/**
 * Entorno de DESARROLLO.
 * Las peticiones a football-data.org se enrutan a través del proxy local
 * definido en proxy.conf.json, evitando CORS durante el `ng serve`.
 *
 * Sustitución automática: en `ng build --configuration production`
 * Angular reemplaza este fichero por environment.prod.ts.
 */
export const environment = {
  production: false,
  /**
   * Base URL para football-data.org.
   * En desarrollo apunta al proxy de Angular Dev Server.
   * En producción (environment.prod.ts) apunta directamente a la API.
   */
  fdApiBase: '/fd-api/v4',
} as const;
