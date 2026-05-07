package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.service.PartidoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipos/{equipoId}/partidos")
@RequiredArgsConstructor
public class PartidoController {

    private final PartidoService partidoService;

    // GET /api/equipos/{equipoId}/partidos
    @GetMapping
    public List<Partido> listar(@PathVariable Long equipoId) {
        return partidoService.listarPorEquipo(equipoId);
    }

    // GET /api/equipos/{equipoId}/partidos/{id}
    @GetMapping("/{id}")
    public Partido obtener(@PathVariable Long equipoId, @PathVariable Long id) {
        return partidoService.buscarPorId(id);
    }

    // POST /api/equipos/{equipoId}/partidos
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Partido crear(@PathVariable Long equipoId, @Valid @RequestBody Partido partido) {
        return partidoService.crear(equipoId, partido);
    }

    // PUT /api/equipos/{equipoId}/partidos/{id}
    @PutMapping("/{id}")
    public Partido actualizar(@PathVariable Long equipoId,
                               @PathVariable Long id,
                               @Valid @RequestBody Partido partido) {
        return partidoService.actualizar(id, partido);
    }

    // DELETE /api/equipos/{equipoId}/partidos/{id}
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long equipoId, @PathVariable Long id) {
        partidoService.eliminar(id);
    }
}
