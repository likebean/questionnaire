package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class PresetOptionGroupVO {
    private Long id;
    private String category;
    private String name;
    private Integer sort;
    private Boolean enabled;
}

