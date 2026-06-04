package com.coachlab.coachlab.service;

import com.coachlab.coachlab.dto.fd.FdMatchDTO;
import com.coachlab.coachlab.dto.partido.EstadisticaInputDTO;
import com.coachlab.coachlab.dto.partido.PartidoConEstadisticasDTO;
import com.coachlab.coachlab.model.Equipo;
import com.coachlab.coachlab.model.Jugador;
import com.coachlab.coachlab.model.OrigenPartido;
import com.coachlab.coachlab.model.Usuario;
import com.coachlab.coachlab.repository.EquipoRepository;
import com.coachlab.coachlab.repository.JugadorRepository;
import com.coachlab.coachlab.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests del mapeo football-data.org → PartidoConEstadisticasDTO.
 * Usan {@link FdMatchMapper#mapToPartidoConEstadisticas} (mapeo puro, sin API).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FdMatchMapperTest {

    @Autowired private FdMatchMapper mapper;
    @Autowired private EquipoRepository equipoRepository;
    @Autowired private JugadorRepository jugadorRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    // ids FD de "nuestro" equipo y rival
    private static final long NUESTRO_FD = 100L;
    private static final long RIVAL_FD = 200L;
    // ids FD de jugadores
    private static final long FD_TITULAR = 11L;
    private static final long FD_SUPLENTE = 22L;

    private Equipo equipo;
    private Jugador titular;
    private Jugador suplente;

    @BeforeEach
    void setUp() {
        Usuario usuario = usuarioRepository.save(Usuario.builder()
                .nombre("Entrenador").email("test-fd@coachlab.test").password("x").build());
        equipo = equipoRepository.save(Equipo.builder().nombre("Nuestro").usuario(usuario).build());
        titular = jugadorRepository.save(Jugador.builder()
                .nombre("Titular").posicion("Delantero").externalId(FD_TITULAR).equipo(equipo).build());
        suplente = jugadorRepository.save(Jugador.builder()
                .nombre("Suplente").posicion("Centrocampista").externalId(FD_SUPLENTE).equipo(equipo).build());
    }

    private FdMatchDTO matchBase(int golesHome, int golesAway) {
        FdMatchDTO m = new FdMatchDTO();
        m.setId(999L);
        m.setUtcDate("2026-03-15T18:00:00Z");

        FdMatchDTO.CompetitionRef comp = new FdMatchDTO.CompetitionRef();
        comp.setName("LaLiga");
        m.setCompetition(comp);

        FdMatchDTO.TeamRef home = new FdMatchDTO.TeamRef();
        home.setId(NUESTRO_FD);
        home.setName("Nuestro CF");
        home.setShortName("Nuestro");

        FdMatchDTO.TeamRef away = new FdMatchDTO.TeamRef();
        away.setId(RIVAL_FD);
        away.setName("Rival United");
        away.setShortName("Rival");

        m.setHomeTeam(home);
        m.setAwayTeam(away);

        FdMatchDTO.Score score = new FdMatchDTO.Score();
        FdMatchDTO.Score.FullTime ft = new FdMatchDTO.Score.FullTime();
        ft.setHome(golesHome);
        ft.setAway(golesAway);
        score.setFullTime(ft);
        m.setScore(score);
        return m;
    }

    private FdMatchDTO.LineupPlayer lineup(long id) {
        FdMatchDTO.LineupPlayer p = new FdMatchDTO.LineupPlayer();
        p.setId(id);
        return p;
    }

    private FdMatchDTO.PlayerRef player(long id) {
        FdMatchDTO.PlayerRef p = new FdMatchDTO.PlayerRef();
        p.setId(id);
        return p;
    }

    @Test
    void esLocalYGolesCorrectos_cuandoSomosHome() {
        FdMatchDTO m = matchBase(3, 1);

        PartidoConEstadisticasDTO dto = mapper.mapToPartidoConEstadisticas(m, equipo.getId(), NUESTRO_FD);

        assertThat(dto.isEsLocal()).isTrue();
        assertThat(dto.getGolesAFavor()).isEqualTo(3);
        assertThat(dto.getGolesEnContra()).isEqualTo(1);
        assertThat(dto.getRival()).isEqualTo("Rival");
        assertThat(dto.getCompeticion()).isEqualTo("LaLiga");
        assertThat(dto.getOrigen()).isEqualTo(OrigenPartido.FOOTBALL_DATA);
        assertThat(dto.getExternalId()).isEqualTo(999L);
    }

    @Test
    void golesInvertidos_cuandoSomosVisitante() {
        FdMatchDTO m = matchBase(3, 1);

        PartidoConEstadisticasDTO dto = mapper.mapToPartidoConEstadisticas(m, equipo.getId(), RIVAL_FD);

        assertThat(dto.isEsLocal()).isFalse();
        assertThat(dto.getGolesAFavor()).isEqualTo(1);
        assertThat(dto.getGolesEnContra()).isEqualTo(3);
        assertThat(dto.getRival()).isEqualTo("Nuestro");
    }

    @Test
    void mapeoBookings_sumaTarjetas() {
        FdMatchDTO m = matchBase(0, 0);
        m.getHomeTeam().setLineup(List.of(lineup(FD_TITULAR)));

        FdMatchDTO.Booking amarilla = new FdMatchDTO.Booking();
        amarilla.setPlayer(player(FD_TITULAR));
        amarilla.setCard("YELLOW");
        FdMatchDTO.Booking roja = new FdMatchDTO.Booking();
        roja.setPlayer(player(FD_TITULAR));
        roja.setCard("RED");
        m.setBookings(List.of(amarilla, roja));

        PartidoConEstadisticasDTO dto = mapper.mapToPartidoConEstadisticas(m, equipo.getId(), NUESTRO_FD);

        EstadisticaInputDTO stat = dto.getEstadisticas().stream()
                .filter(e -> e.getJugadorId().equals(titular.getId())).findFirst().orElseThrow();
        assertThat(stat.getTarjetasAmarillas()).isEqualTo(1);
        assertThat(stat.getTarjetasRojas()).isEqualTo(1);
        assertThat(stat.getMinutosJugados()).isEqualTo(90);
    }

    @Test
    void mapeoSubstitutions_calculaMinutos() {
        FdMatchDTO m = matchBase(0, 0);
        // Titular sale en el 60'; suplente entra en el 60'.
        m.getHomeTeam().setLineup(List.of(lineup(FD_TITULAR)));

        FdMatchDTO.Substitution sub = new FdMatchDTO.Substitution();
        sub.setMinute(60);
        sub.setPlayerOut(player(FD_TITULAR));
        sub.setPlayerIn(player(FD_SUPLENTE));
        m.setSubstitutions(List.of(sub));

        PartidoConEstadisticasDTO dto = mapper.mapToPartidoConEstadisticas(m, equipo.getId(), NUESTRO_FD);

        EstadisticaInputDTO statTitular = dto.getEstadisticas().stream()
                .filter(e -> e.getJugadorId().equals(titular.getId())).findFirst().orElseThrow();
        EstadisticaInputDTO statSuplente = dto.getEstadisticas().stream()
                .filter(e -> e.getJugadorId().equals(suplente.getId())).findFirst().orElseThrow();

        assertThat(statTitular.getMinutosJugados()).isEqualTo(60);     // salió en el 60'
        assertThat(statSuplente.getMinutosJugados()).isEqualTo(30);    // entró en el 60' (90-60)
    }

    @Test
    void degradacion_sinLineupNiEventos_estadisticasVacias() {
        FdMatchDTO m = matchBase(2, 2);   // free tier: sin lineup/bookings/subs

        PartidoConEstadisticasDTO dto = mapper.mapToPartidoConEstadisticas(m, equipo.getId(), NUESTRO_FD);

        assertThat(dto.getGolesAFavor()).isEqualTo(2);
        assertThat(dto.getEstadisticas()).isEmpty();
    }

    @Test
    void fdTeamIdNoParticipa_lanzaError() {
        FdMatchDTO m = matchBase(1, 0);

        assertThatThrownBy(() -> mapper.mapToPartidoConEstadisticas(m, equipo.getId(), 999999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no participa");
    }
}
