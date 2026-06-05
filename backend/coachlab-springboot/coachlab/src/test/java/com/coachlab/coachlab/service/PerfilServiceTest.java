package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.ActualizarPerfilRequest;
import com.coachlab.coachlab.dto.CambiarPasswordRequest;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PerfilServiceTest {

    @Autowired private PerfilService perfilService;
    @Autowired private EquipoService equipoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EquipoRepository equipoRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = usuarioRepository.save(Usuario.builder()
                .nombre("Perfil Test").email("perfil@coachlab.test")
                .password(passwordEncoder.encode("secreta123")).build());
        autenticar(usuario);
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
    void cambiarPassword_actualIncorrecta_lanza401() {
        CambiarPasswordRequest dto = new CambiarPasswordRequest();
        dto.setPasswordActual("incorrecta");
        dto.setPasswordNueva("nuevaclave1");

        assertThatThrownBy(() -> perfilService.cambiarPassword(dto))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void cambiarPassword_actualCorrecta_actualiza() {
        CambiarPasswordRequest dto = new CambiarPasswordRequest();
        dto.setPasswordActual("secreta123");
        dto.setPasswordNueva("nuevaclave1");

        perfilService.cambiarPassword(dto);

        Usuario refrescado = usuarioRepository.findById(usuario.getId()).orElseThrow();
        assertThat(passwordEncoder.matches("nuevaclave1", refrescado.getPassword())).isTrue();
    }

    @Test
    void actualizarPerfil_emailDuplicado_lanza409() {
        usuarioRepository.save(Usuario.builder()
                .nombre("Otro").email("ocupado@coachlab.test").password("x").build());

        ActualizarPerfilRequest dto = new ActualizarPerfilRequest();
        dto.setNombre("Perfil Test");
        dto.setEmail("ocupado@coachlab.test");

        assertThatThrownBy(() -> perfilService.actualizarPerfil(dto))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void actualizarPerfil_cambiaNombreYEmail() {
        ActualizarPerfilRequest dto = new ActualizarPerfilRequest();
        dto.setNombre("Nuevo Nombre");
        dto.setEmail("nuevo@coachlab.test");

        var perfil = perfilService.actualizarPerfil(dto);

        assertThat(perfil.getNombre()).isEqualTo("Nuevo Nombre");
        assertThat(perfil.getEmail()).isEqualTo("nuevo@coachlab.test");
    }

    @Test
    void eliminarCuenta_borraEquiposEnCascada() {
        Equipo equipo = equipoService.crear(Equipo.builder().nombre("Para borrar").build());
        Long equipoId = equipo.getId();

        perfilService.eliminarCuenta("secreta123");

        assertThat(usuarioRepository.findById(usuario.getId())).isEmpty();
        assertThat(equipoRepository.findById(equipoId)).isEmpty();
    }

    @Test
    void eliminarCuenta_passwordIncorrecta_lanza401() {
        assertThatThrownBy(() -> perfilService.eliminarCuenta("malisima"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
