package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.model.ResultadoPartido;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartidoRepository extends JpaRepository<Partido, Long> {

    List<Partido> findByEquipoIdOrderByFechaDesc(Long equipoId);

    List<Partido> findByEquipoIdAndResultado(Long equipoId, ResultadoPartido resultado);

    // Últimos N partidos del equipo (para calcular la racha)
    @Query(value = "SELECT p FROM Partido p WHERE p.equipo.id = :equipoId ORDER BY p.fecha DESC")
    List<Partido> findUltimosPartidos(@Param("equipoId") Long equipoId, Pageable pageable);

    // Media de goles a favor
    @Query("SELECT AVG(p.golesAFavor) FROM Partido p WHERE p.equipo.id = :equipoId AND p.golesAFavor IS NOT NULL")
    Double mediaGolesAFavor(@Param("equipoId") Long equipoId);

    // Media de goles en contra
    @Query("SELECT AVG(p.golesEnContra) FROM Partido p WHERE p.equipo.id = :equipoId AND p.golesEnContra IS NOT NULL")
    Double mediaGolesEnContra(@Param("equipoId") Long equipoId);
}
