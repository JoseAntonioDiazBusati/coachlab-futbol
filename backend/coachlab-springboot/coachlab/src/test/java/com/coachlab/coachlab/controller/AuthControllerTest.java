package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración HTTP del flujo de autenticación y del control de acceso.
 * Cubren los códigos HTTP correctos (200/401/409) y que las rutas protegidas
 * exigen JWT.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        usuarioRepository.save(Usuario.builder()
                .nombre("Existente")
                .email("existente@coachlab.test")
                .password(passwordEncoder.encode("password123"))
                .build());
    }

    private String json(Object o) throws Exception {
        return objectMapper.writeValueAsString(o);
    }

    @Test
    void register_usuarioNuevo_devuelve200ConToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nombre", "Nuevo",
                                "email", "nuevo@coachlab.test",
                                "password", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("nuevo@coachlab.test"));
    }

    @Test
    void register_emailDuplicado_devuelve409() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nombre", "Otro",
                                "email", "existente@coachlab.test",
                                "password", "password123"))))
                .andExpect(status().isConflict());
    }

    @Test
    void login_credencialesValidas_devuelve200ConToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "existente@coachlab.test",
                                "password", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void login_passwordIncorrecta_devuelve401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "existente@coachlab.test",
                                "password", "incorrecta"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rutaProtegida_sinToken_devuelve401() throws Exception {
        mockMvc.perform(get("/api/equipos"))
                .andExpect(status().isUnauthorized());
    }
}
