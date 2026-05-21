package com.coachlab.coachlab.dto.fd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FdJugadorSquadDTO {
    private Long id;
    private String name;
    private String position;
    private String dateOfBirth;
    private String nationality;
    private Integer shirtNumber;
}
