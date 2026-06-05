package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.EstadisticaJugador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EstadisticaJugadorRepository extends JpaRepository<EstadisticaJugador, Long> {

    List<EstadisticaJugador> findByJugadorId(Long jugadorId);

    List<EstadisticaJugador> findByPartidoId(Long partidoId);

    // Total de goles de un jugador en todos sus partidos
    @Query("SELECT SUM(e.goles) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId")
    Integer totalGolesByJugador(@Param("jugadorId") Long jugadorId);

    // Total de asistencias de un jugador
    @Query("SELECT SUM(e.asistencias) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId")
    Integer totalAsistenciasByJugador(@Param("jugadorId") Long jugadorId);

    // Total de minutos jugados
    @Query("SELECT SUM(e.minutosJugados) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId")
    Integer totalMinutosByJugador(@Param("jugadorId") Long jugadorId);

    // Total de tarjetas amarillas
    @Query("SELECT SUM(e.tarjetasAmarillas) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId")
    Integer totalTarjetasAmarillasByJugador(@Param("jugadorId") Long jugadorId);

    // Total de tarjetas rojas
    @Query("SELECT SUM(e.tarjetasRojas) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId")
    Integer totalTarjetasRojasByJugador(@Param("jugadorId") Long jugadorId);

    // Número de partidos en los que el jugador fue titular
    @Query("SELECT COUNT(e) FROM EstadisticaJugador e WHERE e.jugador.id = :jugadorId AND e.esTitular = true")
    Long totalTitularidadesByJugador(@Param("jugadorId") Long jugadorId);
}
