package com.coachlab.coachlab.dto.fd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FdCompeticionDTO {
    private Long id;
    private String code;
    private String name;
    private AreaDTO area;
    private String emblem;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AreaDTO {
        private String name;
    }
}
