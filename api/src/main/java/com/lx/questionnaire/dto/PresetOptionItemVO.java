package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class PresetOptionItemVO {
    private Long id;
    private Integer sortOrder;
    private String label;
    private Boolean allowFill;
    private String description;
    private Boolean descriptionOpenInPopup;
    private String imageUrl;
}

