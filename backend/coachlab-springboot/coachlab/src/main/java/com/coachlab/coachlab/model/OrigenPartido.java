package com.coachlab.coachlab.model;

/**
 * Indica de dónde proviene un partido registrado.
 *
 * <ul>
 *   <li>{@link #MANUAL} — registrado a mano por el entrenador.</li>
 *   <li>{@link #FOOTBALL_DATA} — importado desde football-data.org
 *       (lleva además {@code externalId} con el id del match en la API).</li>
 * </ul>
 */
public enum OrigenPartido {
    MANUAL,
    FOOTBALL_DATA
}
