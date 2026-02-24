package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class AnalyticsScaleSummary {
    private Double avg;
    private List<ScaleDistributionItem> distribution;

    @Data
    public static class ScaleDistributionItem {
        private int value;
        private long count;
    }
}
