package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.EstadisticaJugador;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.repository.EstadisticaJugadorRepository;
import com.coachlab.coachlab.repository.JugadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JugadorService {

    private final JugadorRepository jugadorRepository;
    private final EstadisticaJugadorRepository estadisticaRepository;
    private final EquipoService equipoService;

    public List<Jugador> listarPorEquipo(Long equipoId) {
        return jugadorRepository.findByEquipoId(equipoId);
    }

    public Jugador buscarPorId(Long id) {
        return jugadorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado con id: " + id));
    }

    public Jugador crear(Long equipoId, Jugador jugador) {
        jugador.setEquipo(equipoService.buscarPorId(equipoId));
        return jugadorRepository.save(jugador);
    }

    public Jugador actualizar(Long id, Jugador datos) {
        Jugador jugador = buscarPorId(id);
        jugador.setNombre(datos.getNombre());
        jugador.setApellidos(datos.getApellidos());
        jugador.setDorsal(datos.getDorsal());
        jugador.setPosicion(datos.getPosicion());
        jugador.setEdad(datos.getEdad());
        return jugadorRepository.save(jugador);
    }

    public void eliminar(Long id) {
        jugadorRepository.deleteById(id);
    }

    /**
     * Ranking de impacto de jugadores del equipo.
     * Ordena por su puntuación acumulada en todos los partidos.
     */
    public List<Map<String, Object>> rankingImpacto(Long equipoId) {
        List<Jugador> jugadores = jugadorRepository.findByEquipoId(equipoId);

        return jugadores.stream().map(j -> {
            List<EstadisticaJugador> stats = estadisticaRepository.findByJugadorId(j.getId());

            double impactoTotal = stats.stream()
                    .mapToDouble(EstadisticaJugador::calcularImpacto)
                    .sum();

            Integer goles       = estadisticaRepository.totalGolesByJugador(j.getId());
            Integer asistencias = estadisticaRepository.totalAsistenciasByJugador(j.getId());
            Integer minutos     = estadisticaRepository.totalMinutosByJugador(j.getId());

            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("jugadorId",   j.getId());
            entrada.put("nombre",      j.getNombre() + " " + (j.getApellidos() != null ? j.getApellidos() : ""));
            entrada.put("posicion",    j.getPosicion());
            entrada.put("goles",       goles       != null ? goles       : 0);
            entrada.put("asistencias", asistencias != null ? asistencias : 0);
            entrada.put("minutos",     minutos     != null ? minutos     : 0);
            entrada.put("impacto",     Math.round(impactoTotal * 100.0) / 100.0);
            return entrada;
        })
        .sorted(Comparator.comparingDouble(m -> -((Double) m.get("impacto"))))
        .collect(Collectors.toList());
    }
}
