package com.coachlab.coachlab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Representa un jugador perteneciente a un equipo.
 */
@Entity
@Table(name = "jugadores")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Jugador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del jugador es obligatorio")
    @Column(nullable = false)
    private String nombre;

    private String apellidos;
    private Integer dorsal;
    private String posicion;        // Ej: "Portero", "Defensa", "Centrocampista", "Delantero"
    private Integer edad;
    private String fotoUrl;

    // Id del jugador en football-data.org (si se importó la plantilla desde la API).
    // Permite enlazar eventos de partidos FD (bookings, substitutions) con el jugador.
    private Long externalId;

    // Relación con el equipo — excluida de JSON para evitar ciclos y LazyInitializationException
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private Equipo equipo;

    // Estadísticas por partido — excluidas de JSON
    @JsonIgnore
    @OneToMany(mappedBy = "jugador", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EstadisticaJugador> estadisticas = new ArrayList<>();
}
