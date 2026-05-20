package com.coachlab.coachlab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "usuarios")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String nombre;

    @Email
    @NotBlank
    @Column(unique = true)
    private String email;

    /** Contraseña codificada con BCrypt. */
    @NotBlank
    private String password;
}
