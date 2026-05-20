package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.fd.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * Proxy/BFF hacia football-data.org v4.
 * La API key nunca sale del servidor — el frontend solo recibe los datos ya filtrados.
 */
@Service
@Slf4j
public class FootballDataProxyService {

    private final WebClient webClient;

    public FootballDataProxyService(
            @Value("${coachlab.fd.api-key}") String apiKey,
            @Value("${coachlab.fd.api-base}") String apiBase) {

        this.webClient = WebClient.builder()
                .baseUrl(apiBase)
                .defaultHeader("X-Auth-Token", apiKey)
                .build();
    }

    public List<FdCompeticionDTO> listarCompeticiones() {
        return webClient.get()
                .uri("/competitions")
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> {
                    var arr = n.get("competitions");
                    return mapList(arr, FdCompeticionDTO.class);
                })
                .block();
    }

    public List<FdEquipoDTO> listarEquipos(String code) {
        return webClient.get()
                .uri("/competitions/{code}/teams", code)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("teams"), FdEquipoDTO.class))
                .block();
    }

    public List<FdJugadorSquadDTO> listarPlantilla(Long teamId) {
        return webClient.get()
                .uri("/teams/{id}", teamId)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("squad"), FdJugadorSquadDTO.class))
                .block();
    }

    public List<FdMatchDTO> listarPartidos(Long teamId, int limit, Long competicionId) {
        return webClient.get()
                .uri(ub -> {
                    ub.path("/teams/{id}/matches")
                      .queryParam("status", "FINISHED")
                      .queryParam("limit", limit);
                    if (competicionId != null) ub.queryParam("competitions", competicionId);
                    return ub.build(teamId);
                })
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("matches"), FdMatchDTO.class))
                .block();
    }

    public List<FdGoleadorDTO> listarGoleadores(String code, Integer season, int limit) {
        return webClient.get()
                .uri(ub -> {
                    ub.path("/competitions/{code}/scorers").queryParam("limit", limit);
                    if (season != null) ub.queryParam("season", season);
                    return ub.build(code);
                })
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("scorers"), FdGoleadorDTO.class))
                .block();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private <T> List<T> mapList(com.fasterxml.jackson.databind.JsonNode array, Class<T> cls) {
        if (array == null || !array.isArray()) return List.of();
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            return mapper.readValue(array.toString(),
                    mapper.getTypeFactory().constructCollectionType(List.class, cls));
        } catch (Exception e) {
            log.error("Error mapeando respuesta FD a {}: {}", cls.getSimpleName(), e.getMessage());
            return List.of();
        }
    }
}
