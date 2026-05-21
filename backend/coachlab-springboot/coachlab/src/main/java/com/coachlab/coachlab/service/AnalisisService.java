package com.coachlab.coachlab.service;

import com.coachlab.coachlab.model.Partido;
import com.coachlab.coachlab.model.ResultadoPartido;
import com.coachlab.coachlab.repository.PartidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Motor de análisis estadístico del equipo.
 * Calcula el IRE (Índice de Rendimiento del Equipo) y otras métricas clave.
 */
@Service
@RequiredArgsConstructor
public class AnalisisService {

    private final PartidoRepository partidoRepository;

    /**
     * Calcula el Índice de Rendimiento del Equipo (IRE).
     *
     * Fórmula:
     *   IRE = (victorias * 3 + empates * 1) / totalPartidos
     *       + (mediaGolesAFavor - mediaGolesEnContra) * 0.5
     *
     * El resultado se normaliza a una escala de 0 a 10.
     */
    public double calcularIRE(Long equipoId) {
        List<Partido> partidos = partidoRepository.findByEquipoIdOrderByFechaDesc(equipoId);

        if (partidos.isEmpty()) return 0.0;

        int total = partidos.size();
        long victorias = partidos.stream().filter(p -> p.getResultado() == ResultadoPartido.VICTORIA).count();
        long empates   = partidos.stream().filter(p -> p.getResultado() == ResultadoPartido.EMPATE).count();

        // Puntuación por resultados (máximo posible = 3 puntos/partido)
        double puntuacionResultados = ((victorias * 3.0) + (empates * 1.0)) / (total * 3.0);

        // Diferencia de goles normalizada
        Double mediaAFavor   = partidoRepository.mediaGolesAFavor(equipoId);
        Double mediaEnContra = partidoRepository.mediaGolesEnContra(equipoId);

        double diferenciaGoles = 0;
        if (mediaAFavor != null && mediaEnContra != null) {
            // Normalizamos entre -1 y 1 asumiendo que una diferencia de ±3 goles es el extremo
            diferenciaGoles = Math.max(-1, Math.min(1, (mediaAFavor - mediaEnContra) / 3.0));
        }

        // IRE final en escala 0-10
        double ire = ((puntuacionResultados * 0.7) + (diferenciaGoles * 0.3 + 0.3)) * 10;
        return Math.round(Math.max(0, Math.min(10, ire)) * 100.0) / 100.0;
    }

    /**
     * Devuelve la racha de los últimos 5 partidos como lista de resultados.
     * Ejemplo: ["VICTORIA", "VICTORIA", "EMPATE", "DERROTA", "VICTORIA"]
     */
    public List<String> rachaReciente(Long equipoId) {
        Pageable pageable = PageRequest.of(0, 5);
        return partidoRepository.findUltimosPartidos(equipoId, pageable)
                .stream()
                .map(p -> p.getResultado() != null ? p.getResultado().name() : "PENDIENTE")
                .collect(Collectors.toList());
    }

    /**
     * Estadísticas generales de la temporada para el dashboard.
     */
    public Map<String, Object> resumenTemporada(Long equipoId) {
        List<Partido> partidos = partidoRepository.findByEquipoIdOrderByFechaDesc(equipoId);

        long victorias = partidos.stream().filter(p -> p.getResultado() == ResultadoPartido.VICTORIA).count();
        long empates   = partidos.stream().filter(p -> p.getResultado() == ResultadoPartido.EMPATE).count();
        long derrotas  = partidos.stream().filter(p -> p.getResultado() == ResultadoPartido.DERROTA).count();

        Double mediaAFavor   = partidoRepository.mediaGolesAFavor(equipoId);
        Double mediaEnContra = partidoRepository.mediaGolesEnContra(equipoId);

        int totalGolesAFavor   = partidos.stream().mapToInt(p -> p.getGolesAFavor()   != null ? p.getGolesAFavor()   : 0).sum();
        int totalGolesEnContra = partidos.stream().mapToInt(p -> p.getGolesEnContra() != null ? p.getGolesEnContra() : 0).sum();

        return Map.of(
            "totalPartidos",       partidos.size(),
            "victorias",           victorias,
            "empates",             empates,
            "derrotas",            derrotas,
            "totalGolesAFavor",    totalGolesAFavor,
            "totalGolesEnContra",  totalGolesEnContra,
            "mediaGolesAFavor",    mediaAFavor    != null ? Math.round(mediaAFavor    * 100.0) / 100.0 : 0,
            "mediaGolesEnContra",  mediaEnContra  != null ? Math.round(mediaEnContra  * 100.0) / 100.0 : 0,
            "ire",                 calcularIRE(equipoId),
            "rachaReciente",       rachaReciente(equipoId)
        );
    }

    /**
     * Estimación básica de probabilidades para el próximo partido.
     * Devuelve un mapa con % de victoria, empate y derrota.
     */
    public Map<String, Double> prediccionPartido(Long equipoIdLocal, Long equipoIdVisitante) {
        double ireLocal     = calcularIRE(equipoIdLocal);
        double ireVisitante = calcularIRE(equipoIdVisitante);

        // Ventaja de jugar en casa (~10% histórico en fútbol)
        double ventajaCasa = 1.0;
        double totalIRE    = (ireLocal + ventajaCasa) + ireVisitante;

        double probVictoria = totalIRE > 0 ? ((ireLocal + ventajaCasa) / totalIRE) * 0.75 : 0.33;
        double probDerrota  = totalIRE > 0 ? (ireVisitante / totalIRE) * 0.75 : 0.33;
        double probEmpate   = Math.max(0, 1 - probVictoria - probDerrota);

        // Redondear a 2 decimales
        return Map.of(
            "probabilidadVictoria", Math.round(probVictoria * 10000.0) / 100.0,
            "probabilidadEmpate",   Math.round(probEmpate   * 10000.0) / 100.0,
            "probabilidadDerrota",  Math.round(probDerrota  * 10000.0) / 100.0
        );
    }
}
