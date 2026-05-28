package com.coachlab.coachlab.dto.partido;

import com.coachlab.coachlab.model.EstadisticaJugador;
import com.coachlab.coachlab.model.Jugador;
import lombok.Builder;
import lombok.Data;

/**
 * Estadística individual enriquecida para mostrar en la tabla del frontend
 * (incluye nombre/posición/dorsal del jugador y el impacto calculado), de
 * modo que la UI no necesite una llamada extra para resolver al jugador.
 */
@Data
@Builder
public class EstadisticaDetalleDTO {

    private Long jugadorId;
    private String nombre;
    private String posicion;
    private Integer dorsal;
    private Integer goles;
    private Integer asistencias;
    private Integer minutosJugados;
    private Integer tarjetasAmarillas;
    private Integer tarjetasRojas;
    private double impacto;

    /** Construye el DTO de salida a partir de la entidad y su jugador. */
    public static EstadisticaDetalleDTO from(EstadisticaJugador e) {
        Jugador j = e.getJugador();
        String apellidos = j.getApellidos() != null ? " " + j.getApellidos() : "";
        return EstadisticaDetalleDTO.builder()
                .jugadorId(j.getId())
                .nombre(j.getNombre() + apellidos)
                .posicion(j.getPosicion())
                .dorsal(j.getDorsal())
                .goles(e.getGoles())
                .asistencias(e.getAsistencias())
                .minutosJugados(e.getMinutosJugados())
                .tarjetasAmarillas(e.getTarjetasAmarillas())
                .tarjetasRojas(e.getTarjetasRojas())
                .impacto(Math.round(e.calcularImpacto() * 100.0) / 100.0)
                .build();
    }
}
