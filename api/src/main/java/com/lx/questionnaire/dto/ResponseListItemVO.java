package com.lx.questionnaire.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ResponseListItemVO {
    private Long id;
    /** 提交用户ID，匿名答卷可为 null */
    @JsonProperty("userId")
    private String userId;
    private LocalDateTime submittedAt;
    private Integer durationSeconds;
    private String summary;
}
