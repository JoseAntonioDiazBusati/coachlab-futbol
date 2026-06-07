package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.Jugador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JugadorRepository extends JpaRepository<Jugador, Long> {
    List<Jugador> findByEquipoId(Long equipoId);
    List<Jugador> findByPosicion(String posicion);

    // Aislamiento por propietario: solo encuentra el jugador si pertenece al equipo dado.
    Optional<Jugador> findByIdAndEquipoId(Long id, Long equipoId);
}
