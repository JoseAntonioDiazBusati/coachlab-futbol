package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    List<Equipo> findByTemporada(String temporada);
    List<Equipo> findByNombreContainingIgnoreCase(String nombre);

    // ── Aislamiento por usuario ──────────────────────────────────────────────
    List<Equipo> findByUsuarioId(Long usuarioId);
    Optional<Equipo> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByIdAndUsuarioId(Long id, Long usuarioId);

    // Backfill de migración: equipos previos a la columna usuario_id.
    List<Equipo> findByUsuarioIsNull();
}
