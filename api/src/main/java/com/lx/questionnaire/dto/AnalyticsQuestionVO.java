package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class AnalyticsQuestionVO {
    private Long questionId;
    private String type;
    private String title;
    private Object summary; // 单选/多选: List<AnalyticsOptionSummary>; 量表: AnalyticsScaleSummary; 填空: List<String>
}
