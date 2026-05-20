package com.coachlab.coachlab.dto.fd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FdMatchDTO {
    private Long id;
    private String utcDate;
    private String status;
    private CompetitionRef competition;
    private TeamRef homeTeam;
    private TeamRef awayTeam;
    private Score score;
    private List<Booking> bookings;
    private List<Substitution> substitutions;

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CompetitionRef {
        private Long id;
        private String code;
        private String name;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TeamRef {
        private Long id;
        private String name;
        private String shortName;
        private List<LineupPlayer> lineup;
        private List<LineupPlayer> bench;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LineupPlayer {
        private Long id;
        private String name;
        private String position;
        private Integer shirtNumber;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Score {
        private FullTime fullTime;

        @Data @JsonIgnoreProperties(ignoreUnknown = true)
        public static class FullTime {
            private Integer home;
            private Integer away;
        }
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Booking {
        private Integer minute;
        private TeamRef team;
        private PlayerRef player;
        private String card;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Substitution {
        private Integer minute;
        private TeamRef team;
        private PlayerRef playerOut;
        private PlayerRef playerIn;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlayerRef {
        private Long id;
        private String name;
    }
}
