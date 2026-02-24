package com.lx.questionnaire.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SurveyListItemVO {
    private String id;
    private String title;
    private String status;
    private Long responseCount;
    private LocalDateTime updatedAt;
    private LocalDateTime createdAt;
}
