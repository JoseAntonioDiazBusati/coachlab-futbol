package com.coachlab.coachlab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Confirmación de borrado de cuenta: requiere la contraseña actual. */
@Data
public class EliminarCuentaRequest {
    @NotBlank
    private String password;
}
