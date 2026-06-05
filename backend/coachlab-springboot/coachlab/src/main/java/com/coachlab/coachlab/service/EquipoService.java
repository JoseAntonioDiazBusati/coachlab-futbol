package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.repository.EquipoRepository;
import com.coachlab.coachlab.security.UsuarioActualService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Gestión de equipos con aislamiento por usuario: cada entrenador solo accede
 * a sus propios equipos. Las violaciones de pertenencia se devuelven como 404
 * (no se filtra la existencia de equipos ajenos).
 */
@Service
@RequiredArgsConstructor
public class EquipoService {

    private final EquipoRepository equipoRepository;
    private final UsuarioActualService usuarioActual;

    /** Equipos del usuario autenticado. */
    public List<Equipo> listarMisEquipos() {
        return equipoRepository.findByUsuarioId(usuarioActual.id());
    }

    /** Busca un equipo propio del usuario autenticado (404 si no existe o es ajeno). */
    public Equipo buscarPorId(Long id) {
        return equipoRepository.findByIdAndUsuarioId(id, usuarioActual.id())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Equipo no encontrado con id: " + id));
    }

    public Equipo crear(Equipo equipo) {
        equipo.setUsuario(usuarioActual.obtener());
        return equipoRepository.save(equipo);
    }

    public Equipo actualizar(Long id, Equipo datos) {
        Equipo equipo = buscarPorId(id);   // valida pertenencia
        equipo.setNombre(datos.getNombre());
        equipo.setCategoria(datos.getCategoria());
        equipo.setTemporada(datos.getTemporada());
        equipo.setEscudoUrl(datos.getEscudoUrl());
        return equipoRepository.save(equipo);
    }

    public void eliminar(Long id) {
        Equipo equipo = buscarPorId(id);   // valida pertenencia
        equipoRepository.delete(equipo);
    }
}
