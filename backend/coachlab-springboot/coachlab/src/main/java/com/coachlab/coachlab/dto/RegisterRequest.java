package com.coachlab.coachlab.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String nombre;
    @Email @NotBlank
    private String email;
    @NotBlank @Size(min = 6)
    private String password;
    /** Rol opcional: "ENTRENADOR" (por defecto) u "OJEADOR". */
    private String rol;
}
