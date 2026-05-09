package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.repository.EquipoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EquipoService {

    private final EquipoRepository equipoRepository;

    public List<Equipo> listarTodos() {
        return equipoRepository.findAll();
    }

    public Equipo buscarPorId(Long id) {
        return equipoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Equipo no encontrado con id: " + id));
    }

    public Equipo crear(Equipo equipo) {
        return equipoRepository.save(equipo);
    }

    public Equipo actualizar(Long id, Equipo datos) {
        Equipo equipo = buscarPorId(id);
        equipo.setNombre(datos.getNombre());
        equipo.setCategoria(datos.getCategoria());
        equipo.setTemporada(datos.getTemporada());
        equipo.setEscudoUrl(datos.getEscudoUrl());
        return equipoRepository.save(equipo);
    }

    public void eliminar(Long id) {
        equipoRepository.deleteById(id);
    }
}
