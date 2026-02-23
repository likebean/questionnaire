package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class SubmitRequestDTO {
    private List<SubmitItemDTO> items;
    private Integer durationSeconds;
}
