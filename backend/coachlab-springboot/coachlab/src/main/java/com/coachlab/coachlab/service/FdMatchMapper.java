package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.fd.FdMatchDTO;
import com.coachlab.coachlab.dto.partido.EstadisticaInputDTO;
import com.coachlab.coachlab.dto.partido.PartidoConEstadisticasDTO;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.model.OrigenPartido;
import com.coachlab.coachlab.repository.JugadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Convierte un partido de football-data.org ({@link FdMatchDTO}) en un
 * {@link PartidoConEstadisticasDTO} listo para previsualizar/guardar como
 * partido propio del equipo.
 *
 * <p><strong>Degradación obligatoria:</strong> en el plan gratuito de
 * football-data.org no llegan {@code lineup}, {@code bookings} ni
 * {@code substitutions}. En ese caso el mapeo produce igualmente un partido
 * válido con el marcador y {@code estadisticas = []} — nunca falla por
 * ausencia de eventos.</p>
 *
 * <p>El enlace evento→jugador se hace por {@code Jugador.externalId} (el id del
 * jugador en football-data.org). Los jugadores locales sin {@code externalId}
 * no pueden enlazarse y se ignoran en el mapeo automático.</p>
 */
@Service
@RequiredArgsConstructor
public class FdMatchMapper {

    private final FootballDataProxyService fdService;
    private final JugadorRepository jugadorRepository;

    /**
     * Descarga el match de football-data.org y lo mapea a la previa editable.
     */
    public PartidoConEstadisticasDTO construirPreview(Long equipoId, Long fdMatchId, Long fdTeamId) {
        FdMatchDTO match = fdService.getMatch(fdMatchId);
        if (match == null) {
            throw new IllegalArgumentException("No se encontró el partido FD " + fdMatchId);
        }
        return mapToPartidoConEstadisticas(match, equipoId, fdTeamId);
    }

    /**
     * Mapeo puro (sin acceso a la API externa), testeable de forma aislada.
     *
     * @param fdTeamId id del equipo en football-data.org que corresponde a "nosotros".
     * @throws IllegalArgumentException si {@code fdTeamId} no es ni local ni visitante.
     */
    public PartidoConEstadisticasDTO mapToPartidoConEstadisticas(FdMatchDTO match, Long equipoId, Long fdTeamId) {
        FdMatchDTO.TeamRef home = match.getHomeTeam();
        FdMatchDTO.TeamRef away = match.getAwayTeam();

        boolean esLocal = home != null && fdTeamId.equals(home.getId());
        boolean esVisitante = away != null && fdTeamId.equals(away.getId());
        if (!esLocal && !esVisitante) {
            throw new IllegalArgumentException(
                    "El equipo FD " + fdTeamId + " no participa en el partido " + match.getId());
        }

        FdMatchDTO.TeamRef nuestro = esLocal ? home : away;
        FdMatchDTO.TeamRef rival = esLocal ? away : home;

        PartidoConEstadisticasDTO dto = new PartidoConEstadisticasDTO();
        dto.setFecha(parseFecha(match.getUtcDate()));
        dto.setRival(nombreEquipo(rival));
        dto.setEsLocal(esLocal);
        dto.setCompeticion(match.getCompetition() != null ? match.getCompetition().getName() : null);
        dto.setOrigen(OrigenPartido.FOOTBALL_DATA);
        dto.setExternalId(match.getId());

        // Marcador
        Integer golesHome = null, golesAway = null;
        if (match.getScore() != null && match.getScore().getFullTime() != null) {
            golesHome = match.getScore().getFullTime().getHome();
            golesAway = match.getScore().getFullTime().getAway();
        }
        dto.setGolesAFavor(esLocal ? golesHome : golesAway);
        dto.setGolesEnContra(esLocal ? golesAway : golesHome);

        dto.setEstadisticas(mapearEstadisticas(match, nuestro, equipoId));
        return dto;
    }

    // ── Estadísticas por jugador ─────────────────────────────────────────────

    private List<EstadisticaInputDTO> mapearEstadisticas(
            FdMatchDTO match, FdMatchDTO.TeamRef nuestro, Long equipoId) {

        // FD player id → jugadorId local (solo jugadores con externalId).
        Map<Long, Long> fdToLocal = jugadorRepository.findByEquipoId(equipoId).stream()
                .filter(j -> j.getExternalId() != null)
                .collect(Collectors.toMap(Jugador::getExternalId, Jugador::getId, (a, b) -> a));

        if (fdToLocal.isEmpty()) {
            return new ArrayList<>();   // sin enlaces posibles → degradación
        }

        // Acumulador por jugadorId local, preservando orden de aparición.
        Map<Long, EstadisticaInputDTO> porJugador = new LinkedHashMap<>();
        Function<Long, EstadisticaInputDTO> getOrCreate = localId ->
                porJugador.computeIfAbsent(localId, id -> {
                    EstadisticaInputDTO e = new EstadisticaInputDTO();
                    e.setJugadorId(id);
                    return e;
                });

        // Titulares: minutos base 90.
        if (nuestro != null && nuestro.getLineup() != null) {
            for (FdMatchDTO.LineupPlayer p : nuestro.getLineup()) {
                Long localId = fdToLocal.get(p.getId());
                if (localId != null) getOrCreate.apply(localId).setMinutosJugados(90);
            }
        }

        // Sustituciones: ajustan minutos (salió → minuto de salida; entró → 90 - minuto).
        if (match.getSubstitutions() != null) {
            for (FdMatchDTO.Substitution s : match.getSubstitutions()) {
                if (s.getPlayerOut() != null) {
                    Long out = fdToLocal.get(s.getPlayerOut().getId());
                    if (out != null) getOrCreate.apply(out).setMinutosJugados(minutoSeguro(s.getMinute()));
                }
                if (s.getPlayerIn() != null) {
                    Long in = fdToLocal.get(s.getPlayerIn().getId());
                    if (in != null) getOrCreate.apply(in).setMinutosJugados(90 - minutoSeguro(s.getMinute()));
                }
            }
        }

        // Tarjetas.
        if (match.getBookings() != null) {
            for (FdMatchDTO.Booking b : match.getBookings()) {
                if (b.getPlayer() == null) continue;
                Long localId = fdToLocal.get(b.getPlayer().getId());
                if (localId == null) continue;
                EstadisticaInputDTO e = getOrCreate.apply(localId);
                String card = b.getCard() != null ? b.getCard().toUpperCase() : "";
                switch (card) {
                    case "YELLOW" -> e.setTarjetasAmarillas(e.getTarjetasAmarillas() + 1);
                    case "RED" -> e.setTarjetasRojas(e.getTarjetasRojas() + 1);
                    case "YELLOW_RED" -> {
                        e.setTarjetasAmarillas(e.getTarjetasAmarillas() + 1);
                        e.setTarjetasRojas(e.getTarjetasRojas() + 1);
                    }
                    default -> { /* tarjeta desconocida: ignorar */ }
                }
            }
        }

        return new ArrayList<>(porJugador.values());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private int minutoSeguro(Integer minute) {
        if (minute == null) return 0;
        return Math.max(0, Math.min(120, minute));
    }

    private String nombreEquipo(FdMatchDTO.TeamRef t) {
        if (t == null) return "Rival";
        return t.getShortName() != null ? t.getShortName() : t.getName();
    }

    private LocalDate parseFecha(String utcDate) {
        if (utcDate == null || utcDate.isBlank()) return LocalDate.now();
        try {
            return OffsetDateTime.parse(utcDate).toLocalDate();
        } catch (Exception e) {
            // utcDate puede venir como "YYYY-MM-DD" sin hora.
            try {
                return LocalDate.parse(utcDate.substring(0, 10));
            } catch (Exception ignored) {
                return LocalDate.now();
            }
        }
    }
}
