package com.lx.questionnaire.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SurveyListResponse {
    private List<SurveyListItemVO> list;
    private long total;
}
