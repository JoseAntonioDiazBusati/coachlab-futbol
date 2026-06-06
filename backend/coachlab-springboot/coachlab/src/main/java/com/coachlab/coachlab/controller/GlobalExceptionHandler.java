package com.coachlab.coachlab.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Manejo global de errores para respuestas JSON limpias.
 *
 * Usa HashMap en lugar de Map.of() para evitar NullPointerException
 * cuando ex.getMessage() devuelve null (frecuente en excepciones JPA/Hibernate).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 400 Bad Request — fallos de validación Bean Validation ───────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errores = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                    error -> error.getField(),
                    error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Valor inválido",
                    (msg1, msg2) -> msg1 + "; " + msg2
                ));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(
                "Validation Error", String.join("; ", errores.values())
        ));
    }

    // ── Reenvío de errores HTTP de servicios externos (football-data.org) ────

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(body(
                "External API Error", ex.getReason()
        ));
    }

    // ── 400 Bad Request — argumento ilegal (p.ej. formato incorrecto) ────────

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(
                "Bad Request", ex.getMessage()
        ));
    }

    // ── 401 Unauthorized — credenciales inválidas en el login ────────────────

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body(
                "Unauthorized", "Email o contraseña incorrectos"
        ));
    }

    // ── 409 Conflict — entidad ya existe (email duplicado, etc.) ─────────────

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body(
                "Conflict", ex.getMessage()
        ));
    }

    // ── 404 Not Found — entidad no encontrada ────────────────────────────────

    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(
                "Not Found", ex.getMessage()
        ));
    }

    // ── 500 Internal Server Error — cualquier otra excepción ─────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        // Log the full error (visible en la consola del backend)
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body(
                "Internal Server Error", ex.getMessage()
        ));
    }

    // ── Helper null-safe ──────────────────────────────────────────────────────

    private Map<String, Object> body(String error, String mensaje) {
        Map<String, Object> m = new HashMap<>();
        m.put("timestamp", LocalDateTime.now().toString());
        m.put("error",     error);
        m.put("mensaje",   mensaje != null ? mensaje : "Sin detalle");
        return m;
    }
}
