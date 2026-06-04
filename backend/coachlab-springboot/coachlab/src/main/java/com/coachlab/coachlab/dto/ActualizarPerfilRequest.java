package com.coachlab.coachlab.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ActualizarPerfilRequest {
    @NotBlank
    private String nombre;
    @Email @NotBlank
    private String email;
}
