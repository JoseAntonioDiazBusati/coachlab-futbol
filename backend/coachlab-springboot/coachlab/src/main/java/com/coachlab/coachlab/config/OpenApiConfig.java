package com.coachlab.coachlab.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración del contrato OpenAPI (Swagger UI en /swagger-ui.html).
 * Declara el esquema de seguridad JWT Bearer para poder probar endpoints
 * autenticados desde la propia interfaz.
 */
@Configuration
public class OpenApiConfig {

    private static final String JWT_SCHEME = "bearer-jwt";

    @Bean
    public OpenAPI coachlabOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CoachLab Fútbol API")
                        .description("API REST para gestión y análisis de equipos de fútbol base/amateur. "
                                + "Autenticación JWT: obtén un token en /api/auth/login y úsalo con el botón Authorize.")
                        .version("1.0.0")
                        .license(new License().name("Académico")))
                .addSecurityItem(new SecurityRequirement().addList(JWT_SCHEME))
                .components(new Components().addSecuritySchemes(JWT_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
