package com.coachlab.coachlab.model;

/**
 * Rol del usuario dentro de la aplicación.
 *
 * <ul>
 *   <li>{@link #ENTRENADOR} — gestiona sus equipos: crea/edita plantillas y
 *       registra partidos. Es el rol por defecto.</li>
 *   <li>{@link #OJEADOR} — solo lectura: puede consultar y comparar las
 *       plantillas/alineaciones de otros equipos, pero no editar.</li>
 * </ul>
 */
public enum Rol {
    ENTRENADOR,
    OJEADOR
}
