package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.AuthResponse;
import com.coachlab.coachlab.dto.LoginRequest;
import com.coachlab.coachlab.dto.RegisterRequest;
import com.coachlab.coachlab.model.Rol;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.UsuarioRepository;
import com.coachlab.coachlab.security.CustomUserDetails;
import com.coachlab.coachlab.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authManager;

    public AuthResponse register(RegisterRequest req) {
        if (usuarioRepository.existsByEmail(req.getEmail())) {
            throw new IllegalStateException("El email ya está registrado.");
        }
        Usuario usuario = Usuario.builder()
                .nombre(req.getNombre())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .rol(parseRol(req.getRol()))
                .build();
        usuarioRepository.save(usuario);
        String token = tokenProvider.generateToken(usuario.getEmail(), usuario.getRol().name());
        return new AuthResponse(token, usuario.getEmail(), usuario.getNombre(), usuario.getRol().name());
    }

    public AuthResponse login(LoginRequest req) {
        // authenticate() ya carga el usuario (vía UserDetailsServiceImpl) y verifica
        // la contraseña con BCrypt. Leemos el Usuario del principal para no repetir
        // la consulta a la base de datos.
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        Usuario usuario = ((CustomUserDetails) auth.getPrincipal()).getUsuario();
        String token = tokenProvider.generateToken(usuario.getEmail(), usuario.getRol().name());
        return new AuthResponse(token, usuario.getEmail(), usuario.getNombre(), usuario.getRol().name());
    }

    /** Convierte el rol del request a enum; ENTRENADOR si es nulo o inválido. */
    private Rol parseRol(String rol) {
        if (rol == null || rol.isBlank()) return Rol.ENTRENADOR;
        try {
            return Rol.valueOf(rol.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Rol.ENTRENADOR;
        }
    }
}
