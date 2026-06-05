package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.ActualizarPerfilRequest;
import com.coachlab.coachlab.dto.CambiarPasswordRequest;
import com.coachlab.coachlab.dto.PerfilDTO;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.EquipoRepository;
import com.coachlab.coachlab.repository.UsuarioRepository;
import com.coachlab.coachlab.security.UsuarioActualService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gestión del perfil del usuario autenticado: consulta, actualización de datos,
 * cambio de contraseña y eliminación de cuenta (con borrado en cascada).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;
    private final UsuarioActualService usuarioActual;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PerfilDTO obtenerPerfilActual() {
        return PerfilDTO.from(usuarioActual.obtener());
    }

    /** Actualiza nombre y email. Valida que el nuevo email no esté en uso por otro. */
    public PerfilDTO actualizarPerfil(ActualizarPerfilRequest dto) {
        Usuario usuario = usuarioActual.obtener();

        if (!usuario.getEmail().equalsIgnoreCase(dto.getEmail())
                && usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado.");
        }

        usuario.setNombre(dto.getNombre());
        usuario.setEmail(dto.getEmail());
        return PerfilDTO.from(usuarioRepository.save(usuario));
    }

    /** Cambia la contraseña verificando primero la actual. */
    public void cambiarPassword(CambiarPasswordRequest dto) {
        Usuario usuario = usuarioActual.obtener();
        if (!passwordEncoder.matches(dto.getPasswordActual(), usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La contraseña actual no es correcta.");
        }
        usuario.setPassword(passwordEncoder.encode(dto.getPasswordNueva()));
        usuarioRepository.save(usuario);
    }

    /**
     * Elimina la cuenta y todos sus datos (equipos → jugadores → partidos →
     * estadísticas, vía cascade). Requiere confirmar la contraseña.
     */
    public void eliminarCuenta(String passwordConfirmacion) {
        Usuario usuario = usuarioActual.obtener();
        if (!passwordEncoder.matches(passwordConfirmacion, usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La contraseña no es correcta.");
        }
        // Borrar primero los equipos del usuario (cascade a jugadores, partidos
        // y estadísticas) de forma explícita, para no depender del estado en
        // memoria de la colección Usuario.equipos.
        equipoRepository.deleteAll(equipoRepository.findByUsuarioId(usuario.getId()));
        usuarioRepository.delete(usuario);
    }
}
