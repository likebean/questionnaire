package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class AnalyticsOptionSummary {
    private int optionIndex;
    private String label;
    private long count;
    private double ratio;
}
