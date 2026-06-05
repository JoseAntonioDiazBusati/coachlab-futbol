package com.coachlab.coachlab.dto.partido;

import com.coachlab.coachlab.model.OrigenPartido;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Carga útil para crear o actualizar un partido junto con las estadísticas
 * de cada jugador en una sola llamada (endpoints {@code /partidos/full}).
 */
@Data
public class PartidoConEstadisticasDTO {

    @NotNull(message = "La fecha del partido es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "El rival es obligatorio")
    private String rival;

    private boolean esLocal;

    @Min(value = 0, message = "Los goles a favor no pueden ser negativos")
    private Integer golesAFavor;

    @Min(value = 0, message = "Los goles en contra no pueden ser negativos")
    private Integer golesEnContra;

    private String competicion;
    private String observaciones;

    /** Si es null se asume MANUAL (lo decide el servicio). */
    private OrigenPartido origen;

    /** Solo para origen FOOTBALL_DATA: id del match en football-data.org. */
    private Long externalId;

    @Valid
    private List<EstadisticaInputDTO> estadisticas = new ArrayList<>();
}
