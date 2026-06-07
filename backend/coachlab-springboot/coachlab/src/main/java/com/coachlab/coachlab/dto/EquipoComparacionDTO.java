package com.coachlab.coachlab.dto;

import com.coachlab.coachlab.model.Equipo;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Vista pública (solo lectura) de un equipo para la pantalla de comparación.
 * No expone datos sensibles del propietario: solo su nombre visible.
 */
@Data
@AllArgsConstructor
public class EquipoComparacionDTO {
    private Long id;
    private String nombre;
    private String categoria;
    private String temporada;
    private String ciudad;
    private String entrenador;

    public static EquipoComparacionDTO from(Equipo e) {
        return new EquipoComparacionDTO(
                e.getId(),
                e.getNombre(),
                e.getCategoria(),
                e.getTemporada(),
                e.getCiudad(),
                e.getUsuario() != null ? e.getUsuario().getNombre() : null);
    }
}
