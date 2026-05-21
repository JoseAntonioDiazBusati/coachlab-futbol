package com.coachlab.coachlab.dto.fd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FdGoleadorDTO {
    private PlayerRef player;
    private TeamRef team;
    private Integer playedMatches;
    private Integer goals;
    private Integer assists;
    private Integer penalties;

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlayerRef {
        private Long id;
        private String name;
        private Integer shirtNumber;
        private String position;
        private String dateOfBirth;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TeamRef {
        private Long id;
        private String name;
    }
}
