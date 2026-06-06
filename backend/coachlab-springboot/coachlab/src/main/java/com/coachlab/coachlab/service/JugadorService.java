package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.EstadisticaJugador;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.repository.EstadisticaJugadorRepository;
import com.coachlab.coachlab.repository.JugadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class JugadorService {

    private final JugadorRepository jugadorRepository;
    private final EstadisticaJugadorRepository estadisticaRepository;
    private final EquipoService equipoService;

    @Transactional(readOnly = true)
    public List<Jugador> listarPorEquipo(Long equipoId) {
        equipoService.buscarPorId(equipoId);   // valida pertenencia del equipo
        return jugadorRepository.findByEquipoId(equipoId);
    }

    /**
     * Busca un jugador validando que pertenece al equipo indicado y que ese
     * equipo es del usuario autenticado. Devuelve 404 si no existe o es ajeno
     * (no se filtra la existencia de recursos de otros usuarios).
     */
    @Transactional(readOnly = true)
    public Jugador buscarPorId(Long equipoId, Long id) {
        equipoService.buscarPorId(equipoId);   // valida pertenencia del equipo (404 si ajeno)
        return jugadorRepository.findByIdAndEquipoId(id, equipoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Jugador no encontrado con id: " + id));
    }

    public Jugador crear(Long equipoId, Jugador jugador) {
        jugador.setEquipo(equipoService.buscarPorId(equipoId));
        return jugadorRepository.save(jugador);
    }

    public Jugador actualizar(Long equipoId, Long id, Jugador datos) {
        Jugador jugador = buscarPorId(equipoId, id);   // valida pertenencia (404 si ajeno)
        jugador.setNombre(datos.getNombre());
        jugador.setApellidos(datos.getApellidos());
        jugador.setDorsal(datos.getDorsal());
        jugador.setPosicion(datos.getPosicion());
        jugador.setEdad(datos.getEdad());
        return jugadorRepository.save(jugador);
    }

    public void eliminar(Long equipoId, Long id) {
        Jugador jugador = buscarPorId(equipoId, id);   // valida pertenencia (404 si ajeno)
        jugadorRepository.delete(jugador);
    }

    /**
     * Ranking de impacto de jugadores del equipo.
     * Ordena por su puntuación acumulada en todos los partidos.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> rankingImpacto(Long equipoId) {
        equipoService.buscarPorId(equipoId);   // valida pertenencia del equipo
        return construirRanking(equipoId);
    }

    /**
     * Construye el ranking de impacto del equipo SIN validar la propiedad.
     * Uso interno para la comparación de plantillas (solo lectura) entre equipos.
     * La validación de existencia/permisos corresponde a quien lo invoque.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> construirRanking(Long equipoId) {
        List<Jugador> jugadores = jugadorRepository.findByEquipoId(equipoId);

        return jugadores.stream().map(j -> {
            List<EstadisticaJugador> stats = estadisticaRepository.findByJugadorId(j.getId());

            double impactoTotal = stats.stream()
                    .mapToDouble(s -> s.calcularImpacto())
                    .sum();

            Integer goles         = estadisticaRepository.totalGolesByJugador(j.getId());
            Integer asistencias   = estadisticaRepository.totalAsistenciasByJugador(j.getId());
            Integer minutos       = estadisticaRepository.totalMinutosByJugador(j.getId());
            Integer amarillas     = estadisticaRepository.totalTarjetasAmarillasByJugador(j.getId());
            Integer rojas         = estadisticaRepository.totalTarjetasRojasByJugador(j.getId());
            Long    titularidades = estadisticaRepository.totalTitularidadesByJugador(j.getId());

            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("jugadorId",      j.getId());
            entrada.put("nombre",         j.getNombre() + " " + (j.getApellidos() != null ? j.getApellidos() : ""));
            entrada.put("posicion",       j.getPosicion());
            entrada.put("dorsal",         j.getDorsal());
            entrada.put("goles",          goles         != null ? goles         : 0);
            entrada.put("asistencias",    asistencias   != null ? asistencias   : 0);
            entrada.put("minutos",        minutos       != null ? minutos       : 0);
            entrada.put("tarjetasAmarillas", amarillas  != null ? amarillas     : 0);
            entrada.put("tarjetasRojas",  rojas         != null ? rojas         : 0);
            entrada.put("titularidades",  titularidades != null ? titularidades : 0L);
            entrada.put("impacto",        Math.round(impactoTotal * 100.0) / 100.0);
            return entrada;
        })
        .sorted(Comparator.comparingDouble(m -> -((Double) m.get("impacto"))))
        .collect(Collectors.toList());
    }
}
