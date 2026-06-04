package com.coachlab.coachlab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    /** Momento de alta de la cuenta. Se fija una sola vez al persistir. */
    @Column(updatable = false)
    private LocalDateTime fechaRegistro;

    /**
     * Equipos del usuario. Cascade total + orphanRemoval para que eliminar la
     * cuenta arrastre equipos → jugadores → partidos → estadísticas.
     */
    @JsonIgnore
    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Equipo> equipos = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        if (this.fechaRegistro == null) {
            this.fechaRegistro = LocalDateTime.now();
        }
    }
}
