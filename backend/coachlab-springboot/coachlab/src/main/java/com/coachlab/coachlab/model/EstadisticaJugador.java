package com.coachlab.coachlab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Estadísticas individuales de un jugador en un partido concreto.
 * Es la tabla pivote entre Jugador y Partido.
 */
@Entity
@Table(name = "estadisticas_jugadores")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadisticaJugador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación con el jugador — excluida de JSON para evitar ciclos
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "jugador_id", nullable = false)
    private Jugador jugador;

    // Relación con el partido — excluida de JSON
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partido_id", nullable = false)
    private Partido partido;

    // Estadísticas básicas del MVP
    @Builder.Default
    private Integer goles = 0;

    @Builder.Default
    private Integer asistencias = 0;

    @Builder.Default
    private Integer minutosJugados = 0;

    @Builder.Default
    private Integer tarjetasAmarillas = 0;

    @Builder.Default
    private Integer tarjetasRojas = 0;

    /**
     * Calcula el índice de impacto del jugador en este partido.
     * Fórmula básica del MVP:
     *   goles * 3 + asistencias * 2 - tarjetasRojas * 3 - tarjetasAmarillas
     *   ajustado proporcionalmente a los minutos jugados.
     */
    public double calcularImpacto() {
        double puntuacionBase = (goles * 3.0) + (asistencias * 2.0)
                - (tarjetasRojas * 3.0) - (tarjetasAmarillas * 1.0);

        // Normalizar por minutos: si jugó 90' cuenta al 100%, si jugó menos se ajusta
        double factorMinutos = minutosJugados > 0 ? (minutosJugados / 90.0) : 0;
        return puntuacionBase * factorMinutos;
    }
}
