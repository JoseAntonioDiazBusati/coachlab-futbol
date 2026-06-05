package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.EquipoRepository;
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
 * Tests de aislamiento por usuario en {@link EquipoService}.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EquipoServiceTest {

    @Autowired private EquipoService equipoService;
    @Autowired private EquipoRepository equipoRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    private Usuario usuarioA;
    private Usuario usuarioB;

    @BeforeEach
    void setUp() {
        usuarioA = usuarioRepository.save(Usuario.builder()
                .nombre("A").email("a@coachlab.test").password("x").build());
        usuarioB = usuarioRepository.save(Usuario.builder()
                .nombre("B").email("b@coachlab.test").password("x").build());
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
    void listar_soloDevuelveEquiposDelUsuarioActual() {
        autenticar(usuarioA);
        equipoService.crear(Equipo.builder().nombre("Equipo A1").build());
        equipoService.crear(Equipo.builder().nombre("Equipo A2").build());

        autenticar(usuarioB);
        equipoService.crear(Equipo.builder().nombre("Equipo B1").build());

        autenticar(usuarioA);
        List<Equipo> deA = equipoService.listarMisEquipos();
        assertThat(deA).hasSize(2);
        assertThat(deA).extracting(Equipo::getNombre).containsExactlyInAnyOrder("Equipo A1", "Equipo A2");
    }

    @Test
    void crear_asignaUsuarioActualAutomaticamente() {
        autenticar(usuarioA);
        Equipo creado = equipoService.crear(Equipo.builder().nombre("Mi Equipo").build());
        assertThat(creado.getUsuario().getId()).isEqualTo(usuarioA.getId());
    }

    @Test
    void buscarPorId_equipoDeOtroUsuario_lanza404() {
        autenticar(usuarioA);
        Equipo deA = equipoService.crear(Equipo.builder().nombre("Privado de A").build());

        autenticar(usuarioB);
        assertThatThrownBy(() -> equipoService.buscarPorId(deA.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void eliminar_equipoDeOtroUsuario_lanza404_yNoBorra() {
        autenticar(usuarioA);
        Equipo deA = equipoService.crear(Equipo.builder().nombre("No tocar").build());

        autenticar(usuarioB);
        assertThatThrownBy(() -> equipoService.eliminar(deA.getId()))
                .isInstanceOf(ResponseStatusException.class);

        // Sigue existiendo en BD.
        assertThat(equipoRepository.findById(deA.getId())).isPresent();
    }
}
