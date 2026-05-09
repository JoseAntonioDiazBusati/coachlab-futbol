package com.coachlab.coachlab.repository;

import com.coachlab.coachlab.model.Jugador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JugadorRepository extends JpaRepository<Jugador, Long> {
    List<Jugador> findByEquipoId(Long equipoId);
    List<Jugador> findByPosicion(String posicion);
}
