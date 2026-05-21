package com.coachlab.coachlab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa un partido disputado por el equipo.
 */
@Entity
@Table(name = "partidos")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Partido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "La fecha del partido es obligatoria")
    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private String rival;

    // true = local, false = visitante
    private boolean esLocal;

    private Integer golesAFavor;
    private Integer golesEnContra;

    // Resultado calculado automáticamente
    @Enumerated(EnumType.STRING)
    private ResultadoPartido resultado;  // VICTORIA, EMPATE, DERROTA

    private String observaciones;       // Notas del entrenador sobre el partido

    // Relación con el equipo — excluida de JSON
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private Equipo equipo;

    // Estadísticas individuales — excluidas de JSON
    @JsonIgnore
    @OneToMany(mappedBy = "partido", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EstadisticaJugador> estadisticasJugadores = new ArrayList<>();

    /**
     * Calcula el resultado automáticamente al registrar los goles.
     */
    @PrePersist
    @PreUpdate
    public void calcularResultado() {
        if (golesAFavor != null && golesEnContra != null) {
            if (golesAFavor > golesEnContra) {
                this.resultado = ResultadoPartido.VICTORIA;
            } else if (golesAFavor.equals(golesEnContra)) {
                this.resultado = ResultadoPartido.EMPATE;
            } else {
                this.resultado = ResultadoPartido.DERROTA;
            }
        }
    }
}
