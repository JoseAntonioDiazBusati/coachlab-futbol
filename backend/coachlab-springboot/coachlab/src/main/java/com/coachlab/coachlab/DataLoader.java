package com.coachlab.coachlab;

import com.coachlab.coachlab.model.*;
import com.coachlab.coachlab.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Carga 3 usuarios de prueba con sus datos al arrancar, SOLO si
 * {@code coachlab.seed-demo=true} (perfil dev, o variable COACHLAB_SEED_DEMO en
 * despliegue). Nunca se ejecuta en test ni en producción por defecto.
 *
 * <ul>
 *   <li><b>entrenador1@coachlab.test</b> — rol ENTRENADOR — equipo con 15 jugadores.</li>
 *   <li><b>entrenador2@coachlab.test</b> — rol ENTRENADOR — equipo con 18 jugadores.</li>
 *   <li><b>ojeador@coachlab.test</b> — rol OJEADOR — trabaja con el equipo del
 *       entrenador 1 y puede comparar las alineaciones de ambos entrenadores.</li>
 * </ul>
 * Contraseña común: <b>coachlab123</b>.
 */
@Component
@ConditionalOnProperty(name = "coachlab.seed-demo", havingValue = "true")
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final EquipoRepository    equipoRepo;
    private final JugadorRepository   jugadorRepo;
    private final PartidoRepository   partidoRepo;
    private final EstadisticaJugadorRepository estadisticaRepo;
    private final UsuarioRepository   usuarioRepo;
    private final PasswordEncoder     passwordEncoder;

    private static final String PASS = "coachlab123";

    private static final String[] NOMBRES = {
        "Carlos","Miguel","David","Alejandro","Javier","Sergio","Pablo","Adrián",
        "Daniel","Hugo","Marcos","Iván","Rubén","Mario","Álvaro","Diego","Raúl","Jorge"
    };
    private static final String[] APELLIDOS = {
        "García","Fernández","López","Martínez","Sánchez","Pérez","Gómez","Ruiz",
        "Díaz","Moreno","Muñoz","Álvarez","Romero","Navarro","Torres","Domínguez","Vázquez","Ramos"
    };
    // Posiciones por dorsal (11 titulares + suplentes). Cubre hasta 18 jugadores.
    private static final String[] POSICIONES = {
        "Portero","Defensa","Defensa","Defensa","Defensa",
        "Centrocampista","Centrocampista","Centrocampista","Centrocampista",
        "Delantero","Delantero",
        "Portero","Defensa","Centrocampista","Delantero",
        "Defensa","Centrocampista","Delantero"
    };

    @Override
    public void run(String... args) {
        if (usuarioRepo.existsByEmail("entrenador1@coachlab.test")) {
            System.out.println("✅ Usuarios de prueba ya presentes. Seed omitido.");
            return;
        }

        Usuario entrenador1 = crearUsuario("Antonio Entrenador", "entrenador1@coachlab.test", Rol.ENTRENADOR);
        Usuario entrenador2 = crearUsuario("Lucía Entrenadora",  "entrenador2@coachlab.test", Rol.ENTRENADOR);
        crearUsuario("Óscar Ojeador", "ojeador@coachlab.test", Rol.OJEADOR);

        // Offsets de nombres distintos por equipo → plantillas diferentes.
        crearEquipoConDatos(entrenador1, "CD Atlético Coachlab", "Amateur Senior", "Madrid", 15, 0, 0, 1);
        crearEquipoConDatos(entrenador2, "Racing de los Pinos",  "Regional",       "Sevilla", 18, 9, 4, 2);

        System.out.println("""

            ✅ CoachLab Fútbol — datos de prueba cargados.
            👤 entrenador1@coachlab.test / coachlab123  (ENTRENADOR · 15 jugadores)
            👤 entrenador2@coachlab.test / coachlab123  (ENTRENADOR · 18 jugadores)
            👁  ojeador@coachlab.test      / coachlab123  (OJEADOR · compara plantillas)
            🌐 API: http://localhost:8080/api  ·  Swagger: http://localhost:8080/swagger-ui.html
            """);
    }

    private Usuario crearUsuario(String nombre, String email, Rol rol) {
        return usuarioRepo.save(Usuario.builder()
                .nombre(nombre)
                .email(email)
                .password(passwordEncoder.encode(PASS))
                .rol(rol)
                .build());
    }

    private static final String[] RIVALES = {"Unión Deportiva", "CF Costa", "Atlético del Sur"};
    private static final int[][] MARCADORES = {{3, 1}, {2, 2}, {1, 0}};

    /**
     * Crea un equipo con {@code numJugadores} (nombres únicos según los offsets)
     * y 3 partidos registrados con estadísticas por jugador. Las estadísticas son
     * deterministas (no aleatorias) y se acumulan desde esos partidos, de modo que
     * el ranking y la comparación reflejan datos reales de partidos disputados.
     */
    private void crearEquipoConDatos(Usuario dueno, String nombre, String categoria, String ciudad,
                                     int numJugadores, int offNombre, int offApellido, int teamSeed) {
        Equipo equipo = equipoRepo.save(Equipo.builder()
                .nombre(nombre).categoria(categoria).temporada("2024/2025")
                .ciudad(ciudad).usuario(dueno).build());

        List<Jugador> jugadores = new ArrayList<>();
        for (int i = 0; i < numJugadores; i++) {
            jugadores.add(jugadorRepo.save(Jugador.builder()
                    .nombre(NOMBRES[(i + offNombre) % NOMBRES.length])
                    .apellidos(APELLIDOS[(i + offApellido) % APELLIDOS.length])
                    .dorsal(i + 1)
                    .posicion(POSICIONES[i % POSICIONES.length])
                    .edad(18 + ((i * 2 + teamSeed) % 18))
                    .equipo(equipo)
                    .build()));
        }

        // 3 partidos recientes con estadísticas → datos reales para ranking/comparación.
        for (int m = 0; m < MARCADORES.length; m++) {
            Partido partido = partidoRepo.save(Partido.builder()
                    .fecha(LocalDate.now().minusWeeks(MARCADORES.length - m))
                    .rival(RIVALES[m]).esLocal(m % 2 == 0)
                    .golesAFavor(MARCADORES[m][0]).golesEnContra(MARCADORES[m][1])
                    .competicion("Liga").origen(OrigenPartido.MANUAL)
                    .equipo(equipo).build());

            for (int i = 0; i < jugadores.size(); i++) {
                Jugador j = jugadores.get(i);
                boolean titular = i < 11;
                int minutos = titular ? 90 : (i < 14 ? (20 + ((i + m) % 4) * 10) : 0);
                if (minutos == 0) continue;   // no participó en este partido

                // Semilla determinista por equipo/partido/jugador → estadísticas variadas.
                int seed = teamSeed * 100 + m * 31 + i * 7;
                String pos = j.getPosicion();
                int goles = "Delantero".equals(pos) ? (seed % 3)
                          : "Centrocampista".equals(pos) ? (seed % 2)
                          : 0;
                int asistencias = (seed % 4 == 0) ? 1 + (seed % 2) : 0;
                int amarillas   = (seed % 5 == 0) ? 1 : 0;
                int rojas       = (seed % 23 == 0) ? 1 : 0;

                estadisticaRepo.save(EstadisticaJugador.builder()
                        .jugador(j).partido(partido)
                        .goles(goles).asistencias(asistencias)
                        .minutosJugados(minutos)
                        .tarjetasAmarillas(amarillas).tarjetasRojas(rojas)
                        .esTitular(titular)
                        .build());
            }
        }
    }
}
