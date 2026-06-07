package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.dto.EquipoComparacionDTO;
import com.coachlab.coachlab.service.ExplorarService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de solo lectura para comparar plantillas de otros equipos.
 * Accesibles por cualquier usuario autenticado (entrenador u ojeador).
 */
@RestController
@RequestMapping("/api/explorar")
@RequiredArgsConstructor
public class ExplorarController {

    private final ExplorarService explorarService;

    // GET /api/explorar/equipos — todos los equipos de la app
    @GetMapping("/equipos")
    public List<EquipoComparacionDTO> equipos() {
        return explorarService.listarEquipos();
    }

    // GET /api/explorar/equipos/{id}/jugadores — plantilla/ranking de un equipo cualquiera
    @GetMapping("/equipos/{id}/jugadores")
    public List<Map<String, Object>> plantilla(@PathVariable Long id) {
        return explorarService.plantilla(id);
    }
}
