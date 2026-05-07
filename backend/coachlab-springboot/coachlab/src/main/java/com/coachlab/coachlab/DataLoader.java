package com.coachlab.coachlab;

import com.coachlab.coachlab.model.*;
import com.coachlab.coachlab.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Carga datos de ejemplo al arrancar la aplicación.
 * Útil para probar la API desde el primer momento.
 */
@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final EquipoRepository equipoRepo;
    private final JugadorRepository jugadorRepo;
    private final PartidoRepository partidoRepo;
    private final EstadisticaJugadorRepository estadisticaRepo;

    @Override
    public void run(String... args) {

        // ── Equipo ────────────────────────────────────────────
        Equipo equipo = equipoRepo.save(Equipo.builder()
                .nombre("CD Atlético Coachlab")
                .categoria("Amateur Senior")
                .temporada("2024/2025")
                .build());

        // ── Jugadores ─────────────────────────────────────────
        Jugador portero = jugadorRepo.save(Jugador.builder()
                .nombre("Carlos").apellidos("García").dorsal(1)
                .posicion("Portero").edad(25).equipo(equipo).build());

        Jugador defensa = jugadorRepo.save(Jugador.builder()
                .nombre("Miguel").apellidos("Fernández").dorsal(4)
                .posicion("Defensa").edad(28).equipo(equipo).build());

        Jugador centrocampista = jugadorRepo.save(Jugador.builder()
                .nombre("David").apellidos("López").dorsal(8)
                .posicion("Centrocampista").edad(23).equipo(equipo).build());

        Jugador delantero = jugadorRepo.save(Jugador.builder()
                .nombre("Alejandro").apellidos("Martínez").dorsal(9)
                .posicion("Delantero").edad(22).equipo(equipo).build());

        // ── Partidos ──────────────────────────────────────────
        Partido p1 = partidoRepo.save(Partido.builder()
                .fecha(LocalDate.now().minusWeeks(4)).rival("UD Rivales FC")
                .esLocal(true).golesAFavor(3).golesEnContra(1).equipo(equipo).build());

        Partido p2 = partidoRepo.save(Partido.builder()
                .fecha(LocalDate.now().minusWeeks(3)).rival("CF Contrarios")
                .esLocal(false).golesAFavor(1).golesEnContra(1).equipo(equipo).build());

        Partido p3 = partidoRepo.save(Partido.builder()
                .fecha(LocalDate.now().minusWeeks(2)).rival("AD Oponentes")
                .esLocal(true).golesAFavor(2).golesEnContra(0).equipo(equipo).build());

        Partido p4 = partidoRepo.save(Partido.builder()
                .fecha(LocalDate.now().minusWeeks(1)).rival("SC Adversarios")
                .esLocal(false).golesAFavor(0).golesEnContra(2).equipo(equipo).build());

        // ── Estadísticas individuales ─────────────────────────

        // Partido 1: victoria 3-1
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(delantero).partido(p1)
                .goles(2).asistencias(0).minutosJugados(90).tarjetasAmarillas(0).build());
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(centrocampista).partido(p1)
                .goles(1).asistencias(2).minutosJugados(90).build());
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(defensa).partido(p1)
                .goles(0).asistencias(1).minutosJugados(90).build());

        // Partido 2: empate 1-1
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(delantero).partido(p2)
                .goles(1).asistencias(0).minutosJugados(75).build());
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(centrocampista).partido(p2)
                .goles(0).asistencias(1).minutosJugados(90).tarjetasAmarillas(1).build());

        // Partido 3: victoria 2-0
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(delantero).partido(p3)
                .goles(1).asistencias(0).minutosJugados(90).build());
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(centrocampista).partido(p3)
                .goles(1).asistencias(1).minutosJugados(90).build());

        // Partido 4: derrota 0-2
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(delantero).partido(p4)
                .goles(0).asistencias(0).minutosJugados(90).tarjetasAmarillas(1).build());
        estadisticaRepo.save(EstadisticaJugador.builder().jugador(defensa).partido(p4)
                .goles(0).asistencias(0).minutosJugados(90).tarjetasRojas(1).build());

        System.out.println("\n✅ CoachLab Fútbol arrancado correctamente.");
        System.out.println("📊 Datos de ejemplo cargados.");
        System.out.println("🌐 API disponible en: http://localhost:8080/api");
        System.out.println("🗄️  Consola H2 en:    http://localhost:8080/h2-console");
        System.out.println("   → JDBC URL: jdbc:h2:mem:coachlabdb\n");
    }
}
