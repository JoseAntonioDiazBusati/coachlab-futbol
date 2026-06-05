package com.coachlab.coachlab.security;

import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Resuelve el {@link Usuario} autenticado a partir del {@link SecurityContextHolder}.
 *
 * El JWT lleva el email como {@code subject}; el {@code JwtAuthenticationFilter}
 * deja ese email como nombre del principal, así que aquí basta con buscar por
 * email. Evita acoplar un {@code CustomUserDetails} a Spring Security.
 */
@Service
@RequiredArgsConstructor
public class UsuarioActualService {

    private final UsuarioRepository usuarioRepository;

    /** Usuario autenticado. Lanza 401 si no hay sesión o el usuario no existe. */
    public Usuario obtener() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    /** Id del usuario autenticado. */
    public Long id() {
        return obtener().getId();
    }
}
