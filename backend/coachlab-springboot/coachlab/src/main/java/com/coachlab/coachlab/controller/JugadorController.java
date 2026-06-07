package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.service.JugadorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipos/{equipoId}/jugadores")
@RequiredArgsConstructor
public class JugadorController {

    private final JugadorService jugadorService;

    // GET /api/equipos/{equipoId}/jugadores
    @GetMapping
    public List<Jugador> listar(@PathVariable Long equipoId) {
        return jugadorService.listarPorEquipo(equipoId);
    }

    // GET /api/equipos/{equipoId}/jugadores/ranking
    @GetMapping("/ranking")
    public List<Map<String, Object>> rankingImpacto(@PathVariable Long equipoId) {
        return jugadorService.rankingImpacto(equipoId);
    }

    // GET /api/equipos/{equipoId}/jugadores/{id}
    @GetMapping("/{id}")
    public Jugador obtener(@PathVariable Long equipoId, @PathVariable Long id) {
        return jugadorService.buscarPorId(equipoId, id);
    }

    // POST /api/equipos/{equipoId}/jugadores
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Jugador crear(@PathVariable Long equipoId, @Valid @RequestBody Jugador jugador) {
        return jugadorService.crear(equipoId, jugador);
    }

    // PUT /api/equipos/{equipoId}/jugadores/{id}
    @PutMapping("/{id}")
    public Jugador actualizar(@PathVariable Long equipoId,
                               @PathVariable Long id,
                               @Valid @RequestBody Jugador jugador) {
        return jugadorService.actualizar(equipoId, id, jugador);
    }

    // DELETE /api/equipos/{equipoId}/jugadores/{id}
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long equipoId, @PathVariable Long id) {
        jugadorService.eliminar(equipoId, id);
    }
}
