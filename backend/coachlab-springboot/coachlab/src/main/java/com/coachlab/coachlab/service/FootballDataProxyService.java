package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.fd.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Proxy/BFF hacia football-data.org v4.
 *
 * La API key nunca sale del servidor — el frontend sólo recibe los datos
 * ya filtrados. Los errores HTTP de football-data.org (401, 403, 429…)
 * se reenvían al cliente con el mismo código, en lugar de convertirse
 * siempre en 500.
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

    // ── Endpoints ─────────────────────────────────────────────────────────────

    public List<FdCompeticionDTO> listarCompeticiones() {
        return fetch("/competitions")
                .map(n -> mapList(n.get("competitions"), FdCompeticionDTO.class))
                .block();
    }

    public List<FdEquipoDTO> listarEquipos(String code) {
        return fetch("/competitions/{code}/teams", code)
                .map(n -> mapList(n.get("teams"), FdEquipoDTO.class))
                .block();
    }

    public List<FdJugadorSquadDTO> listarPlantilla(Long teamId) {
        return fetch("/teams/{id}", teamId)
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
                .onStatus(HttpStatusCode::isError, res ->
                    res.bodyToMono(String.class)
                       .defaultIfEmpty("")
                       .flatMap(body -> Mono.error(new ResponseStatusException(
                               HttpStatus.valueOf(res.statusCode().value()),
                               "football-data.org: " + body)))
                )
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("matches"), FdMatchDTO.class))
                .block();
    }

    /**
     * Detalle completo de un partido por su id en football-data.org.
     *
     * <p>El endpoint {@code /matches/{id}} devuelve {@code bookings},
     * {@code substitutions} y {@code lineup} <strong>solo en tiers de pago</strong>;
     * en plan gratuito estos campos vienen vacíos o ausentes, por lo que el
     * detalle se limitará al marcador.</p>
     */
    public FdMatchDTO getMatch(Long matchId) {
        return fetch("/matches/{id}", matchId)
                .map(n -> mapOne(n, FdMatchDTO.class))
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
                .onStatus(HttpStatusCode::isError, res ->
                    res.bodyToMono(String.class)
                       .defaultIfEmpty("")
                       .flatMap(body -> Mono.error(new ResponseStatusException(
                               HttpStatus.valueOf(res.statusCode().value()),
                               "football-data.org: " + body)))
                )
                .bodyToMono(JsonNode.class)
                .map(n -> mapList(n.get("scorers"), FdGoleadorDTO.class))
                .block();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * GET simple con manejo de errores: reenvía el código HTTP de FD al cliente.
     */
    private Mono<JsonNode> fetch(String uriTemplate, Object... vars) {
        return webClient.get()
                .uri(uriTemplate, vars)
                .retrieve()
                .onStatus(HttpStatusCode::isError, res ->
                    res.bodyToMono(String.class)
                       .defaultIfEmpty("")
                       .flatMap(body -> {
                           int code = res.statusCode().value();
                           log.warn("football-data.org respondió {} para {}: {}", code, uriTemplate, body);
                           return Mono.error(new ResponseStatusException(
                                   HttpStatus.valueOf(code),
                                   "football-data.org [" + code + "]: " + body));
                       })
                )
                .bodyToMono(JsonNode.class);
    }

    /** Mapea un nodo JSON único (no array) al tipo indicado. Devuelve null si el nodo es nulo. */
    private <T> T mapOne(JsonNode node, Class<T> cls) {
        if (node == null || node.isNull()) return null;
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            return mapper.treeToValue(node, cls);
        } catch (Exception e) {
            log.error("Error mapeando respuesta FD a {}: {}", cls.getSimpleName(), e.getMessage());
            return null;
        }
    }

    private <T> List<T> mapList(JsonNode array, Class<T> cls) {
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
