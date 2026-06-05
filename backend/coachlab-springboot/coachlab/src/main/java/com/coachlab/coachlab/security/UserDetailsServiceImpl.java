package com.coachlab.coachlab.security;

import com.coachlab.coachlab.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Implementación de UserDetailsService desacoplada de SecurityConfig
 * para evitar la dependencia circular:
 *   JwtAuthenticationFilter → UserDetailsService → SecurityConfig → JwtAuthenticationFilter
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        // Devolvemos el Usuario completo envuelto para que AuthService.login()
        // pueda leer nombre/email del principal sin una segunda consulta.
        return new CustomUserDetails(u);
    }
}
