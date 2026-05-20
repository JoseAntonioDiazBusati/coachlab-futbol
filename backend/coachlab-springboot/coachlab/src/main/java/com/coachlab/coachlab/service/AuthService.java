package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.AuthResponse;
import com.coachlab.coachlab.dto.LoginRequest;
import com.coachlab.coachlab.dto.RegisterRequest;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.UsuarioRepository;
import com.coachlab.coachlab.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
            throw new IllegalArgumentException("El email ya está registrado.");
        }
        Usuario usuario = Usuario.builder()
                .nombre(req.getNombre())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .build();
        usuarioRepository.save(usuario);
        String token = tokenProvider.generateToken(usuario.getEmail());
        return new AuthResponse(token, usuario.getEmail(), usuario.getNombre());
    }

    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        Usuario usuario = usuarioRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado."));
        String token = tokenProvider.generateToken(usuario.getEmail());
        return new AuthResponse(token, usuario.getEmail(), usuario.getNombre());
    }
}
