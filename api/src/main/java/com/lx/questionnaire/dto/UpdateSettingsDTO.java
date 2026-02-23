package com.lx.questionnaire.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateSettingsDTO {
    private Boolean limitOncePerUser;
    private Boolean allowAnonymous;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String thankYouText;
}
