package com.coachlab.coachlab.dto.fd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FdEquipoDTO {
    private Long id;
    private String name;
    private String shortName;
    private String tla;
    private AreaDTO area;
    private String crest;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AreaDTO {
        private String name;
    }
}
