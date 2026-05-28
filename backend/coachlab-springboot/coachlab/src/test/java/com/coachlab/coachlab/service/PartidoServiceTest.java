package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.partido.EstadisticaInputDTO;
import com.coachlab.coachlab.dto.partido.PartidoConEstadisticasDTO;
import com.coachlab.coachlab.dto.partido.PartidoDetalleDTO;
import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.model.OrigenPartido;
import com.coachlab.coachlab.repository.EquipoRepository;
import com.coachlab.coachlab.repository.JugadorRepository;
import com.coachlab.coachlab.repository.PartidoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests de integración del flujo de partidos con estadísticas por jugador.
 */
@SpringBootTest
@ActiveProfiles("test")
class PartidoServiceTest {

    @Autowired private PartidoService partidoService;
    @Autowired private EquipoRepository equipoRepository;
    @Autowired private JugadorRepository jugadorRepository;
    @Autowired private PartidoRepository partidoRepository;

    private Equipo equipo;
    private Jugador delantero;
    private Jugador medio;

    @BeforeEach
    void setUp() {
        equipo = equipoRepository.save(Equipo.builder()
                .nombre("Equipo Test").categoria("Amateur").temporada("2025/2026").build());

        delantero = jugadorRepository.save(Jugador.builder()
                .nombre("Goleador").posicion("Delantero").dorsal(9).equipo(equipo).build());
        medio = jugadorRepository.save(Jugador.builder()
                .nombre("Creador").posicion("Centrocampista").dorsal(8).equipo(equipo).build());
    }

    private PartidoConEstadisticasDTO partidoBase() {
        PartidoConEstadisticasDTO dto = new PartidoConEstadisticasDTO();
        dto.setFecha(LocalDate.now());
        dto.setRival("Rival FC");
        dto.setEsLocal(true);
        dto.setGolesAFavor(3);
        dto.setGolesEnContra(1);
        dto.setCompeticion("Liga");
        return dto;
    }

    private EstadisticaInputDTO stat(Long jugadorId, int goles, int asistencias, int minutos) {
        EstadisticaInputDTO e = new EstadisticaInputDTO();
        e.setJugadorId(jugadorId);
        e.setGoles(goles);
        e.setAsistencias(asistencias);
        e.setMinutosJugados(minutos);
        return e;
    }

    @Test
    void crearConEstadisticas_persisteEstadisticas() {
        PartidoConEstadisticasDTO dto = partidoBase();
        dto.setEstadisticas(List.of(
                stat(delantero.getId(), 2, 0, 90),
                stat(medio.getId(), 1, 2, 90)));

        PartidoDetalleDTO detalle = partidoService.crearConEstadisticas(equipo.getId(), dto);

        assertThat(detalle.getId()).isNotNull();
        assertThat(detalle.getResultado()).hasToString("VICTORIA");
        assertThat(detalle.getOrigen()).isEqualTo(OrigenPartido.MANUAL);
        assertThat(detalle.getEstadisticas()).hasSize(2);
        assertThat(detalle.getEstadisticas())
                .extracting("nombre").contains("Goleador", "Creador");
    }

    @Test
    void actualizarConEstadisticas_reemplazaEstadisticas() {
        PartidoConEstadisticasDTO dto = partidoBase();
        dto.setEstadisticas(List.of(stat(delantero.getId(), 2, 0, 90), stat(medio.getId(), 1, 1, 90)));
        PartidoDetalleDTO creado = partidoService.crearConEstadisticas(equipo.getId(), dto);

        // Actualizar: ahora solo el medio tiene estadística.
        PartidoConEstadisticasDTO upd = partidoBase();
        upd.setGolesAFavor(1);
        upd.setGolesEnContra(1);
        upd.setEstadisticas(List.of(stat(medio.getId(), 0, 1, 80)));

        PartidoDetalleDTO actualizado = partidoService.actualizarConEstadisticas(
                creado.getId(), equipo.getId(), upd);

        assertThat(actualizado.getEstadisticas()).hasSize(1);
        assertThat(actualizado.getEstadisticas().get(0).getNombre()).isEqualTo("Creador");
        assertThat(actualizado.getResultado()).hasToString("EMPATE");
    }

    @Test
    void crearConEstadisticas_jugadorDeOtroEquipo_lanzaError() {
        Equipo otro = equipoRepository.save(Equipo.builder().nombre("Otro").build());
        Jugador ajeno = jugadorRepository.save(Jugador.builder()
                .nombre("Ajeno").posicion("Defensa").equipo(otro).build());

        PartidoConEstadisticasDTO dto = partidoBase();
        dto.setEstadisticas(List.of(stat(ajeno.getId(), 1, 0, 90)));

        assertThatThrownBy(() -> partidoService.crearConEstadisticas(equipo.getId(), dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no pertenece al equipo");
    }

    @Test
    void crearConEstadisticas_importacionFD_esIdempotente() {
        PartidoConEstadisticasDTO dto = partidoBase();
        dto.setOrigen(OrigenPartido.FOOTBALL_DATA);
        dto.setExternalId(123456L);
        dto.setEstadisticas(List.of(stat(delantero.getId(), 1, 0, 90)));

        PartidoDetalleDTO primero = partidoService.crearConEstadisticas(equipo.getId(), dto);
        PartidoDetalleDTO segundo = partidoService.crearConEstadisticas(equipo.getId(), dto);

        assertThat(segundo.getId()).isEqualTo(primero.getId());
        long enEquipo = partidoRepository.findByEquipoIdOrderByFechaDesc(equipo.getId()).stream()
                .filter(p -> Long.valueOf(123456L).equals(p.getExternalId()))
                .count();
        assertThat(enEquipo).isEqualTo(1);
    }
}
