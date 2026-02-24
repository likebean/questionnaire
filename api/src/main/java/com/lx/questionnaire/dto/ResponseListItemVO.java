package com.lx.questionnaire.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ResponseListItemVO {
    private Long id;
    private LocalDateTime submittedAt;
    private Integer durationSeconds;
    private String summary;
}
