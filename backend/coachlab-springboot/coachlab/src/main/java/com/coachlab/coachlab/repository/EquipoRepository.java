package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    List<Equipo> findByTemporada(String temporada);
    List<Equipo> findByNombreContainingIgnoreCase(String nombre);
}
