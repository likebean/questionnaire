package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("survey_question")
public class SurveyQuestion {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String surveyId;
    private Integer sortOrder;
    private String type; // SINGLE_CHOICE, MULTIPLE_CHOICE, SHORT_TEXT, LONG_TEXT, SCALE
    private String title;
    private String description;
    private Boolean required;
    private String config; // JSON: options, minChoices, placeholder, scaleMin, etc.
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
