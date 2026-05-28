package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.dto.partido.EstadisticaDetalleDTO;
import com.coachlab.coachlab.dto.partido.PartidoConEstadisticasDTO;
import com.coachlab.coachlab.dto.partido.PartidoDetalleDTO;
import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.service.FdMatchMapper;
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
    private final FdMatchMapper fdMatchMapper;

    // GET /api/equipos/{equipoId}/partidos
    @GetMapping
    public List<Partido> listar(@PathVariable Long equipoId) {
        return partidoService.listarPorEquipo(equipoId);
    }

    // GET /api/equipos/{equipoId}/partidos/{id} — detalle con estadísticas
    @GetMapping("/{id}")
    public PartidoDetalleDTO obtener(@PathVariable Long equipoId, @PathVariable Long id) {
        return partidoService.obtenerDetalle(id);
    }

    // GET /api/equipos/{equipoId}/partidos/{id}/estadisticas
    @GetMapping("/{id}/estadisticas")
    public List<EstadisticaDetalleDTO> estadisticas(@PathVariable Long equipoId, @PathVariable Long id) {
        return partidoService.listarEstadisticas(id);
    }

    // POST /api/equipos/{equipoId}/partidos
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Partido crear(@PathVariable Long equipoId, @Valid @RequestBody Partido partido) {
        return partidoService.crear(equipoId, partido);
    }

    // GET /api/equipos/{equipoId}/partidos/preview-fd?fdMatchId=&fdTeamId=
    // Previa editable de un partido importado desde football-data.org.
    @GetMapping("/preview-fd")
    public PartidoConEstadisticasDTO previewFd(@PathVariable Long equipoId,
                                               @RequestParam Long fdMatchId,
                                               @RequestParam Long fdTeamId) {
        return fdMatchMapper.construirPreview(equipoId, fdMatchId, fdTeamId);
    }

    // POST /api/equipos/{equipoId}/partidos/full — partido + estadísticas en una llamada
    @PostMapping("/full")
    @ResponseStatus(HttpStatus.CREATED)
    public PartidoDetalleDTO crearFull(@PathVariable Long equipoId,
                                       @Valid @RequestBody PartidoConEstadisticasDTO dto) {
        return partidoService.crearConEstadisticas(equipoId, dto);
    }

    // PUT /api/equipos/{equipoId}/partidos/{id}
    @PutMapping("/{id}")
    public Partido actualizar(@PathVariable Long equipoId,
                               @PathVariable Long id,
                               @Valid @RequestBody Partido partido) {
        return partidoService.actualizar(id, partido);
    }

    // PUT /api/equipos/{equipoId}/partidos/{id}/full — actualizar partido + estadísticas (replace)
    @PutMapping("/{id}/full")
    public PartidoDetalleDTO actualizarFull(@PathVariable Long equipoId,
                                            @PathVariable Long id,
                                            @Valid @RequestBody PartidoConEstadisticasDTO dto) {
        return partidoService.actualizarConEstadisticas(id, equipoId, dto);
    }

    // DELETE /api/equipos/{equipoId}/partidos/{id}
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long equipoId, @PathVariable Long id) {
        partidoService.eliminar(id);
    }
}
