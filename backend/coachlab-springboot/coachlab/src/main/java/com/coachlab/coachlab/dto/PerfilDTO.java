package com.coachlab.coachlab.dto;

import com.coachlab.coachlab.model.Usuario;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/** Datos públicos del perfil del usuario (nunca incluye la contraseña). */
@Data
@AllArgsConstructor
public class PerfilDTO {
    private Long id;
    private String email;
    private String nombre;
    private LocalDateTime fechaRegistro;
    private int totalEquipos;

    public static PerfilDTO from(Usuario u) {
        return new PerfilDTO(
                u.getId(),
                u.getEmail(),
                u.getNombre(),
                u.getFechaRegistro(),
                u.getEquipos() != null ? u.getEquipos().size() : 0);
    }
}
