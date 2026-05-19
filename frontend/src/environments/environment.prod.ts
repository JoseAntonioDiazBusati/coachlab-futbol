/**
 * Entorno de PRODUCCIÓN.
 * football-data.org soporta CORS (Access-Control-Allow-Origin: *)
 * por lo que el navegador puede llamar directamente a su API sin proxy.
 *
 * Referencia: https://www.football-data.org/documentation/api
 */
export const environment = {
  production: true,
  /**
   * URL directa a la API v4 de football-data.org.
   * No requiere proxy porque el servidor incluye cabeceras CORS.
   */
  fdApiBase: 'https://api.football-data.org/v4',
  /**
   * API key de football-data.org.
   * Rellena con tu clave de producción antes de compilar.
   * Obtén una gratuita en https://www.football-data.org/client/register
   *
   * ⚠ No subas este valor a control de versiones si el repositorio es público.
   */
  fdApiKey: '',
} as const;
