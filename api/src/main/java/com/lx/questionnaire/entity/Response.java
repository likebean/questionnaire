package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("response")
public class Response {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long surveyId;
    private String userId;
    private LocalDateTime submittedAt;
    private Integer durationSeconds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
