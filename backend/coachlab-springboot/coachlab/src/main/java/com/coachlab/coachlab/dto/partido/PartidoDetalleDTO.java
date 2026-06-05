package com.coachlab.coachlab.dto.partido;

import com.coachlab.coachlab.model.OrigenPartido;
import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.model.ResultadoPartido;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Vista completa de un partido: sus campos más la lista de estadísticas
 * por jugador (enriquecidas). Es la respuesta de los endpoints que crean,
 * actualizan o consultan el detalle de un partido.
 */
@Data
@Builder
public class PartidoDetalleDTO {

    private Long id;
    private LocalDate fecha;
    private String rival;
    private boolean esLocal;
    private Integer golesAFavor;
    private Integer golesEnContra;
    private String competicion;
    private OrigenPartido origen;
    private Long externalId;
    private ResultadoPartido resultado;
    private String observaciones;
    private List<EstadisticaDetalleDTO> estadisticas;

    /** Construye el DTO a partir de la entidad (las estadísticas deben estar inicializadas). */
    public static PartidoDetalleDTO from(Partido p) {
        return PartidoDetalleDTO.builder()
                .id(p.getId())
                .fecha(p.getFecha())
                .rival(p.getRival())
                .esLocal(p.isEsLocal())
                .golesAFavor(p.getGolesAFavor())
                .golesEnContra(p.getGolesEnContra())
                .competicion(p.getCompeticion())
                .origen(p.getOrigen())
                .externalId(p.getExternalId())
                .resultado(p.getResultado())
                .observaciones(p.getObservaciones())
                .estadisticas(p.getEstadisticasJugadores().stream()
                        .map(EstadisticaDetalleDTO::from)
                        .toList())
                .build();
    }
}
