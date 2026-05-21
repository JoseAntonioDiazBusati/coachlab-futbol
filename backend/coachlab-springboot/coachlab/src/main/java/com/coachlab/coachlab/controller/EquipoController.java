package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.service.AnalisisService;
import com.coachlab.coachlab.service.EquipoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipos")
@RequiredArgsConstructor
public class EquipoController {

    private final EquipoService equipoService;
    private final AnalisisService analisisService;

    // GET /api/equipos
    @GetMapping
    public List<Equipo> listar() {
        return equipoService.listarTodos();
    }

    // GET /api/equipos/{id}
    @GetMapping("/{id}")
    public Equipo obtener(@PathVariable Long id) {
        return equipoService.buscarPorId(id);
    }

    // POST /api/equipos
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@Valid @RequestBody Equipo equipo) {
        return equipoService.crear(equipo);
    }

    // PUT /api/equipos/{id}
    @PutMapping("/{id}")
    public Equipo actualizar(@PathVariable Long id, @Valid @RequestBody Equipo equipo) {
        return equipoService.actualizar(id, equipo);
    }

    // DELETE /api/equipos/{id}
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        equipoService.eliminar(id);
    }

    // ─── Endpoints de análisis ─────────────────────────────

    // GET /api/equipos/{id}/ire
    @GetMapping("/{id}/ire")
    public ResponseEntity<Map<String, Object>> obtenerIRE(@PathVariable Long id) {
        double ire = analisisService.calcularIRE(id);
        return ResponseEntity.ok(Map.of(
            "equipoId", id,
            "ire", ire,
            "descripcion", describirIRE(ire)
        ));
    }

    // GET /api/equipos/{id}/resumen
    @GetMapping("/{id}/resumen")
    public ResponseEntity<Map<String, Object>> resumenTemporada(@PathVariable Long id) {
        return ResponseEntity.ok(analisisService.resumenTemporada(id));
    }

    // GET /api/equipos/{idLocal}/prediccion/{idVisitante}
    @GetMapping("/{idLocal}/prediccion/{idVisitante}")
    public ResponseEntity<Map<String, Object>> prediccion(
            @PathVariable Long idLocal,
            @PathVariable Long idVisitante) {

        Map<String, Double> probs = analisisService.prediccionPartido(idLocal, idVisitante);
        Equipo local     = equipoService.buscarPorId(idLocal);
        Equipo visitante = equipoService.buscarPorId(idVisitante);

        return ResponseEntity.ok(Map.of(
            "local",           local.getNombre(),
            "visitante",       visitante.getNombre(),
            "probabilidades",  probs
        ));
    }

    private String describirIRE(double ire) {
        if (ire >= 8)  return "Rendimiento excelente";
        if (ire >= 6)  return "Buen rendimiento";
        if (ire >= 4)  return "Rendimiento regular";
        if (ire >= 2)  return "Rendimiento bajo";
        return "Rendimiento muy bajo";
    }
}
