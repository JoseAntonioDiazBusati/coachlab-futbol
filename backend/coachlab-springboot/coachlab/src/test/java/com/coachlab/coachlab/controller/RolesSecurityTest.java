package com.coachlab.coachlab.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica el control de acceso por roles:
 * el ENTRENADOR puede crear equipos; el OJEADOR es de solo lectura (403 al
 * escribir) pero puede comparar plantillas de otros equipos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RolesSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String registrar(String email, String rol) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "User",
                                "email", email,
                                "password", "password123",
                                "rol", rol))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value(rol))
                .andReturn();
        JsonNode body = objectMapper.readTree(res.getResponse().getContentAsString());
        return body.get("token").asText();
    }

    private String crearEquipo(String token, String nombre) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/equipos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("nombre", nombre))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    void entrenador_puedeCrearEquipo() throws Exception {
        String token = registrar("entrenador@coachlab.test", "ENTRENADOR");
        crearEquipo(token, "Equipo del Entrenador");
    }

    @Test
    void ojeador_noPuedeCrearEquipo_devuelve403() throws Exception {
        String token = registrar("ojeador@coachlab.test", "OJEADOR");
        mockMvc.perform(post("/api/equipos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("nombre", "No permitido"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void ojeador_puedeCompararEquiposDeOtros() throws Exception {
        String tokenEntrenador = registrar("coach2@coachlab.test", "ENTRENADOR");
        crearEquipo(tokenEntrenador, "Equipo Visible");

        String tokenOjeador = registrar("ojeador2@coachlab.test", "OJEADOR");
        mockMvc.perform(get("/api/explorar/equipos")
                        .header("Authorization", "Bearer " + tokenOjeador))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nombre == 'Equipo Visible')]").exists());
    }
}
