package com.coachlab.coachlab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Representa un equipo de fútbol gestionado por un entrenador.
 */
@Entity
@Table(name = "equipos")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Equipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del equipo es obligatorio")
    @Column(nullable = false)
    private String nombre;

    private String categoria;       // Ej: "Infantil A", "Amateur Senior"
    private String temporada;       // Ej: "2024/2025"
    private String ciudad;           // Ciudad del equipo (opcional)
    private String escudoUrl;       // URL de imagen del escudo (opcional)

    // Un equipo tiene muchos jugadores
    @OneToMany(mappedBy = "equipo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Jugador> jugadores = new ArrayList<>();

    // Un equipo tiene muchos partidos
    @OneToMany(mappedBy = "equipo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Partido> partidos = new ArrayList<>();
}
