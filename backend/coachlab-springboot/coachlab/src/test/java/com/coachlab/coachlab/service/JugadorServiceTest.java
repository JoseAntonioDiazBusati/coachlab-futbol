package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.EquipoRepository;
import com.coachlab.coachlab.repository.JugadorRepository;
import com.coachlab.coachlab.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests de aislamiento por propietario en {@link JugadorService}.
 * Verifican que un usuario no puede leer/editar/borrar jugadores ajenos
 * conociendo su id, y que los recursos inexistentes devuelven 404 (no 500).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JugadorServiceTest {

    @Autowired private JugadorService jugadorService;
    @Autowired private EquipoRepository equipoRepository;
    @Autowired private JugadorRepository jugadorRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    private Usuario usuarioA;
    private Usuario usuarioB;
    private Equipo equipoA;
    private Jugador jugadorA;

    @BeforeEach
    void setUp() {
        usuarioA = usuarioRepository.save(Usuario.builder()
                .nombre("A").email("a-jug@coachlab.test").password("x").build());
        usuarioB = usuarioRepository.save(Usuario.builder()
                .nombre("B").email("b-jug@coachlab.test").password("x").build());

        equipoA = equipoRepository.save(Equipo.builder()
                .nombre("Equipo A").usuario(usuarioA).build());
        jugadorA = jugadorRepository.save(Jugador.builder()
                .nombre("Jugador A").posicion("Delantero").dorsal(9).equipo(equipoA).build());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void autenticar(Usuario u) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(u.getEmail(), null, List.of()));
    }

    @Test
    void buscarPorId_propietario_devuelveJugador() {
        autenticar(usuarioA);
        Jugador encontrado = jugadorService.buscarPorId(equipoA.getId(), jugadorA.getId());
        assertThat(encontrado.getNombre()).isEqualTo("Jugador A");
    }

    @Test
    void buscarPorId_jugadorDeOtroUsuario_lanza404() {
        autenticar(usuarioB);
        assertThatThrownBy(() -> jugadorService.buscarPorId(equipoA.getId(), jugadorA.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void buscarPorId_jugadorInexistente_lanza404() {
        autenticar(usuarioA);
        assertThatThrownBy(() -> jugadorService.buscarPorId(equipoA.getId(), 999999L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void actualizar_jugadorDeOtroUsuario_lanza404_yNoModifica() {
        autenticar(usuarioB);
        Jugador datos = Jugador.builder().nombre("Hackeado").posicion("Portero").build();

        assertThatThrownBy(() -> jugadorService.actualizar(equipoA.getId(), jugadorA.getId(), datos))
                .isInstanceOf(ResponseStatusException.class);

        assertThat(jugadorRepository.findById(jugadorA.getId()).orElseThrow().getNombre())
                .isEqualTo("Jugador A");
    }

    @Test
    void eliminar_jugadorDeOtroUsuario_lanza404_yNoBorra() {
        autenticar(usuarioB);
        assertThatThrownBy(() -> jugadorService.eliminar(equipoA.getId(), jugadorA.getId()))
                .isInstanceOf(ResponseStatusException.class);

        assertThat(jugadorRepository.findById(jugadorA.getId())).isPresent();
    }
}
