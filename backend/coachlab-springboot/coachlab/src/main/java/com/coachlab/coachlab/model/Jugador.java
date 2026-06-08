package com.coachlab.coachlab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
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

    // Solo caracteres alfabéticos (con acentos), espacios y los signos típicos de
    // nombres compuestos (' . -). No se permiten números.
    @NotBlank(message = "El nombre del jugador es obligatorio")
    @Pattern(regexp = "^[\\p{L}][\\p{L} .'\\-]*$",
             message = "El nombre solo puede contener letras (sin números)")
    @Column(nullable = false)
    private String nombre;

    @Pattern(regexp = "^[\\p{L} .'\\-]*$",
             message = "Los apellidos solo pueden contener letras (sin números)")
    private String apellidos;

    @Positive(message = "El dorsal debe ser un número positivo")
    @Max(value = 99, message = "El dorsal no puede ser mayor que 99")
    private Integer dorsal;

    private String posicion;        // Ej: "Portero", "Defensa", "Centrocampista", "Delantero"

    @Positive(message = "La edad debe ser un número positivo")
    @Max(value = 120, message = "La edad no es válida")
    private Integer edad;

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
