package com.lx.questionnaire.dto;

import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import lombok.Data;

import java.util.List;

@Data
public class SurveyDetailVO {
    private Long id;
    private String title;
    private String description;
    private String status;
    private String creatorId;
    private Boolean limitOncePerUser;
    private Boolean allowAnonymous;
    private java.time.LocalDateTime startTime;
    private java.time.LocalDateTime endTime;
    private String thankYouText;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
    private List<SurveyQuestion> questions;

    public static SurveyDetailVO from(Survey s, List<SurveyQuestion> questions) {
        SurveyDetailVO vo = new SurveyDetailVO();
        vo.setId(s.getId());
        vo.setTitle(s.getTitle());
        vo.setDescription(s.getDescription());
        vo.setStatus(s.getStatus());
        vo.setCreatorId(s.getCreatorId());
        vo.setLimitOncePerUser(s.getLimitOncePerUser());
        vo.setAllowAnonymous(s.getAllowAnonymous());
        vo.setStartTime(s.getStartTime());
        vo.setEndTime(s.getEndTime());
        vo.setThankYouText(s.getThankYouText());
        vo.setCreatedAt(s.getCreatedAt());
        vo.setUpdatedAt(s.getUpdatedAt());
        vo.setQuestions(questions);
        return vo;
    }
}
