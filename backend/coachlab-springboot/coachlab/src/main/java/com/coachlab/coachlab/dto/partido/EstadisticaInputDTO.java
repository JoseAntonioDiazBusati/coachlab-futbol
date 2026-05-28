package com.coachlab.coachlab.dto.partido;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Estadística individual de un jugador en un partido, tal como la envía el
 * frontend al crear o actualizar un partido. Solo referencia al jugador por id.
 */
@Data
public class EstadisticaInputDTO {

    @NotNull(message = "El jugadorId es obligatorio")
    private Long jugadorId;

    @Min(value = 0, message = "Los goles no pueden ser negativos")
    private Integer goles = 0;

    @Min(value = 0, message = "Las asistencias no pueden ser negativas")
    private Integer asistencias = 0;

    @Min(value = 0, message = "Los minutos no pueden ser negativos")
    @Max(value = 120, message = "Los minutos no pueden superar 120")
    private Integer minutosJugados = 0;

    @Min(value = 0, message = "Las tarjetas amarillas no pueden ser negativas")
    private Integer tarjetasAmarillas = 0;

    @Min(value = 0, message = "Las tarjetas rojas no pueden ser negativas")
    private Integer tarjetasRojas = 0;
}
