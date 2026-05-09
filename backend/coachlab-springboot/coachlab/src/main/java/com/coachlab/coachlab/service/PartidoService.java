package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.repository.PartidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PartidoService {

    private final PartidoRepository partidoRepository;
    private final EquipoService equipoService;

    public List<Partido> listarPorEquipo(Long equipoId) {
        return partidoRepository.findByEquipoIdOrderByFechaDesc(equipoId);
    }

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
}
