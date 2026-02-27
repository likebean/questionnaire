package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class PresetOptionCategoryVO {
    private String category;
    private List<PresetOptionGroupDetailVO> groups;
}

