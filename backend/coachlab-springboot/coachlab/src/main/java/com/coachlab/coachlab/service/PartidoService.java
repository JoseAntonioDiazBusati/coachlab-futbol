package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.partido.EstadisticaDetalleDTO;
import com.coachlab.coachlab.dto.partido.EstadisticaInputDTO;
import com.coachlab.coachlab.dto.partido.PartidoConEstadisticasDTO;
import com.coachlab.coachlab.dto.partido.PartidoDetalleDTO;
import com.coachlab.coachlab.model.EstadisticaJugador;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.model.OrigenPartido;
import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.repository.JugadorRepository;
import com.coachlab.coachlab.repository.PartidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PartidoService {

    private final PartidoRepository partidoRepository;
    private final JugadorRepository jugadorRepository;
    private final EquipoService equipoService;

    @Transactional(readOnly = true)
    public List<Partido> listarPorEquipo(Long equipoId) {
        return partidoRepository.findByEquipoIdOrderByFechaDesc(equipoId);
    }

    @Transactional(readOnly = true)
    public Partido buscarPorId(Long id) {
        return partidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Partido no encontrado con id: " + id));
    }

    public Partido crear(Long equipoId, Partido partido) {
        partido.setEquipo(equipoService.buscarPorId(equipoId));
        return partidoRepository.save(partido);
    }

    public Partido actualizar(Long id, Partido datos) {
        Partido partido = buscarPorId(id);
        partido.setFecha(datos.getFecha());
        partido.setRival(datos.getRival());
        partido.setEsLocal(datos.isEsLocal());
        partido.setGolesAFavor(datos.getGolesAFavor());
        partido.setGolesEnContra(datos.getGolesEnContra());
        partido.setObservaciones(datos.getObservaciones());
        return partidoRepository.save(partido);
    }

    public void eliminar(Long id) {
        partidoRepository.deleteById(id);
    }

    // ── Lecturas con detalle (dentro de transacción para resolver el lazy) ───

    /** Detalle completo de un partido (incluye estadísticas por jugador). */
    @Transactional(readOnly = true)
    public PartidoDetalleDTO obtenerDetalle(Long id) {
        return PartidoDetalleDTO.from(buscarPorId(id));
    }

    /** Solo las estadísticas por jugador de un partido. */
    @Transactional(readOnly = true)
    public List<EstadisticaDetalleDTO> listarEstadisticas(Long id) {
        return buscarPorId(id).getEstadisticasJugadores().stream()
                .map(EstadisticaDetalleDTO::from)
                .toList();
    }

    // ── Partido + estadísticas en una sola operación ─────────────────────────

    /**
     * Crea un partido junto con las estadísticas de cada jugador.
     *
     * <p>Idempotencia para importaciones FD: si llega un {@code externalId} que
     * ya existe para el equipo, devuelve el partido existente sin duplicar.</p>
     *
     * @throws IllegalArgumentException si algún jugadorId no pertenece al equipo.
     */
    public PartidoDetalleDTO crearConEstadisticas(Long equipoId, PartidoConEstadisticasDTO dto) {
        // Idempotencia: mismo match FD ya importado → no duplicar.
        if (dto.getExternalId() != null) {
            var existente = partidoRepository.findByExternalIdAndEquipoId(dto.getExternalId(), equipoId);
            if (existente.isPresent()) {
                return PartidoDetalleDTO.from(existente.get());
            }
        }

        Partido partido = new Partido();
        partido.setEquipo(equipoService.buscarPorId(equipoId));
        aplicarCampos(partido, dto);

        aplicarEstadisticas(partido, equipoId, dto.getEstadisticas());

        return PartidoDetalleDTO.from(partidoRepository.save(partido));
    }

    /**
     * Actualiza un partido y reemplaza por completo sus estadísticas
     * (estrategia <em>replace</em>: se eliminan las anteriores y se crean
     * las del DTO). El {@code orphanRemoval} de la relación borra las viejas.
     */
    public PartidoDetalleDTO actualizarConEstadisticas(Long id, Long equipoId, PartidoConEstadisticasDTO dto) {
        Partido partido = buscarPorId(id);
        aplicarCampos(partido, dto);

        // Replace: limpiar la colección (orphanRemoval borra las huérfanas) y recrear.
        partido.getEstadisticasJugadores().clear();
        aplicarEstadisticas(partido, equipoId, dto.getEstadisticas());

        return PartidoDetalleDTO.from(partidoRepository.save(partido));
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    private void aplicarCampos(Partido partido, PartidoConEstadisticasDTO dto) {
        partido.setFecha(dto.getFecha());
        partido.setRival(dto.getRival());
        partido.setEsLocal(dto.isEsLocal());
        partido.setGolesAFavor(dto.getGolesAFavor());
        partido.setGolesEnContra(dto.getGolesEnContra());
        partido.setCompeticion(dto.getCompeticion());
        partido.setObservaciones(dto.getObservaciones());
        partido.setOrigen(dto.getOrigen() != null ? dto.getOrigen() : OrigenPartido.MANUAL);
        partido.setExternalId(dto.getExternalId());
    }

    /**
     * Crea las {@link EstadisticaJugador} validando que cada jugador pertenece
     * al equipo y las asocia al partido (cascade persistirá al guardar).
     */
    private void aplicarEstadisticas(Partido partido, Long equipoId, List<EstadisticaInputDTO> estadisticas) {
        if (estadisticas == null || estadisticas.isEmpty()) return;

        // Mapa de jugadores válidos del equipo para validar pertenencia en O(1).
        Map<Long, Jugador> jugadoresDelEquipo = jugadorRepository.findByEquipoId(equipoId).stream()
                .collect(Collectors.toMap(Jugador::getId, Function.identity()));

        for (EstadisticaInputDTO e : estadisticas) {
            Jugador jugador = jugadoresDelEquipo.get(e.getJugadorId());
            if (jugador == null) {
                throw new IllegalArgumentException(
                        "El jugador " + e.getJugadorId() + " no pertenece al equipo " + equipoId);
            }
            EstadisticaJugador stat = EstadisticaJugador.builder()
                    .jugador(jugador)
                    .partido(partido)
                    .goles(e.getGoles() != null ? e.getGoles() : 0)
                    .asistencias(e.getAsistencias() != null ? e.getAsistencias() : 0)
                    .minutosJugados(e.getMinutosJugados() != null ? e.getMinutosJugados() : 0)
                    .tarjetasAmarillas(e.getTarjetasAmarillas() != null ? e.getTarjetasAmarillas() : 0)
                    .tarjetasRojas(e.getTarjetasRojas() != null ? e.getTarjetasRojas() : 0)
                    .build();
            partido.getEstadisticasJugadores().add(stat);
        }
    }
}
