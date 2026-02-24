package com.lx.questionnaire.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ResponseDetailVO {
    private Long id;
    private LocalDateTime submittedAt;
    private Integer durationSeconds;
    private List<ResponseDetailItemVO> items;
}
