package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.dto.fd.*;
import com.coachlab.coachlab.service.FootballDataProxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Proxy/BFF endpoints hacia football-data.org.
 *
 * Todos los endpoints requieren JWT (configurado en SecurityConfig).
 * La API key de football-data.org vive exclusivamente en el servidor.
 *
 * | Method | Path                                  | Descripción                       |
 * |--------|---------------------------------------|-----------------------------------|
 * | GET    | /api/fd/competiciones                 | Lista de competiciones disponibles|
 * | GET    | /api/fd/competiciones/{code}/equipos  | Equipos de una competición        |
 * | GET    | /api/fd/competiciones/{code}/scorers  | Goleadores de una competición     |
 * | GET    | /api/fd/teams/{id}/matches            | Partidos de un equipo             |
 * | GET    | /api/fd/teams/{id}                    | Plantilla (squad) de un equipo    |
 */
@RestController
@RequestMapping("/api/fd")
@RequiredArgsConstructor
public class FootballDataController {

    private final FootballDataProxyService fdService;

    /** Lista todas las competiciones disponibles para la API key configurada. */
    @GetMapping("/competiciones")
    public List<FdCompeticionDTO> competiciones() {
        return fdService.listarCompeticiones();
    }

    /** Lista los equipos de una competición por su código (ej: "PL", "PD"). */
    @GetMapping("/competiciones/{code}/equipos")
    public List<FdEquipoDTO> equipos(@PathVariable String code) {
        return fdService.listarEquipos(code);
    }

    /**
     * Lista los goleadores/asistentes de una competición.
     *
     * @param code   Código de competición (ej: "PL")
     * @param season Año de inicio de la temporada (ej: 2024 para 2024/25). Opcional.
     * @param limit  Número máximo de resultados (por defecto 50).
     */
    @GetMapping("/competiciones/{code}/scorers")
    public List<FdGoleadorDTO> scorers(
            @PathVariable String code,
            @RequestParam(required = false) Integer season,
            @RequestParam(defaultValue = "50") int limit) {
        return fdService.listarGoleadores(code, season, limit);
    }

    /**
     * Lista los partidos finalizados de un equipo.
     *
     * @param id           ID numérico del equipo en football-data.org.
     * @param limit        Número máximo de partidos (por defecto 10).
     * @param competicionId Filtrar por competición (opcional).
     */
    @GetMapping("/teams/{id}/matches")
    public List<FdMatchDTO> matches(
            @PathVariable Long id,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) Long competicionId) {
        return fdService.listarPartidos(id, limit, competicionId);
    }

    /**
     * Devuelve la plantilla (squad) de un equipo.
     *
     * @param id ID numérico del equipo en football-data.org.
     */
    @GetMapping("/teams/{id}")
    public List<FdJugadorSquadDTO> squad(@PathVariable Long id) {
        return fdService.listarPlantilla(id);
    }
}
