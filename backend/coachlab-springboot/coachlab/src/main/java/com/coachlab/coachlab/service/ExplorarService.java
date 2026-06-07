package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.EquipoComparacionDTO;
import com.coachlab.coachlab.repository.EquipoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Exploración/comparación de plantillas de cualquier equipo de la aplicación
 * (solo lectura). Disponible para entrenadores y ojeadores, para comparar
 * alineaciones y plantillas más allá de las propias.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExplorarService {

    private final EquipoRepository equipoRepository;
    private final JugadorService jugadorService;

    /** Todos los equipos de la app (vista pública para comparar). */
    public List<EquipoComparacionDTO> listarEquipos() {
        return equipoRepository.findAll().stream()
                .map(EquipoComparacionDTO::from)
                .toList();
    }

    /** Plantilla (ranking de impacto) de cualquier equipo, sin requerir ser el propietario. */
    public List<Map<String, Object>> plantilla(Long equipoId) {
        equipoRepository.findById(equipoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Equipo no encontrado con id: " + equipoId));
        return jugadorService.construirRanking(equipoId);
    }
}
