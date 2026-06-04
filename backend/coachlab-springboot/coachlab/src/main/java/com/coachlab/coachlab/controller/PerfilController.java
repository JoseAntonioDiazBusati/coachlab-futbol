package com.coachlab.coachlab.controller;

import com.coachlab.coachlab.dto.ActualizarPerfilRequest;
import com.coachlab.coachlab.dto.CambiarPasswordRequest;
import com.coachlab.coachlab.dto.EliminarCuentaRequest;
import com.coachlab.coachlab.dto.PerfilDTO;
import com.coachlab.coachlab.service.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Gestión del perfil del usuario autenticado. Todos los endpoints requieren JWT
 * (cubierto por `/api/**` en SecurityConfig).
 */
@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;

    // GET /api/perfil
    @GetMapping
    public PerfilDTO obtener() {
        return perfilService.obtenerPerfilActual();
    }

    // PUT /api/perfil
    @PutMapping
    public PerfilDTO actualizar(@Valid @RequestBody ActualizarPerfilRequest dto) {
        return perfilService.actualizarPerfil(dto);
    }

    // PUT /api/perfil/password
    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cambiarPassword(@Valid @RequestBody CambiarPasswordRequest dto) {
        perfilService.cambiarPassword(dto);
    }

    // DELETE /api/perfil
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@Valid @RequestBody EliminarCuentaRequest dto) {
        perfilService.eliminarCuenta(dto.getPassword());
    }
}
