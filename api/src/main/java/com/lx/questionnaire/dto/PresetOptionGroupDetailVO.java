package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class PresetOptionGroupDetailVO {
    private Long id;
    private String category;
    private String name;
    private Integer sort;
    private Boolean enabled;
    private List<PresetOptionItemVO> items;
}

