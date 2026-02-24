package com.lx.questionnaire.dto;

import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import lombok.Data;

import java.util.List;

/** 填写页用：问卷基础信息 + 题目列表，不含答卷 */
@Data
public class FillSurveyVO {
    private Long id;
    private String title;
    private String description;
    private String thankYouText;
    private List<SurveyQuestion> questions;

    public static FillSurveyVO from(Survey s, List<SurveyQuestion> questions) {
        FillSurveyVO vo = new FillSurveyVO();
        vo.setId(s.getId());
        vo.setTitle(s.getTitle());
        vo.setDescription(s.getDescription());
        vo.setThankYouText(s.getThankYouText());
        vo.setQuestions(questions);
        return vo;
    }
}
