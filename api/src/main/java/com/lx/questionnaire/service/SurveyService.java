package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;

import java.util.List;

public interface SurveyService {

    SurveyListResponse list(String creatorId, String status, String keyword, int page, int pageSize, String sort);

    Survey create(String creatorId, String title, String description);

    SurveyDetailVO getDetail(Long id, String currentUserId);

    void updateBasic(Long id, String currentUserId, String title, String description);

    void updateSettings(Long id, String currentUserId, Boolean limitOncePerUser, Boolean allowAnonymous,
                        java.time.LocalDateTime startTime, java.time.LocalDateTime endTime, String thankYouText);

    void publish(Long id, String currentUserId);

    void pause(Long id, String currentUserId);

    void resume(Long id, String currentUserId);

    void end(Long id, String currentUserId);

    Survey copy(Long id, String currentUserId);

    void delete(Long id, String currentUserId);

    String getFillUrl(Long id);

    List<SurveyQuestion> listQuestions(Long surveyId, String currentUserId);

    SurveyQuestion addQuestion(Long surveyId, String currentUserId, SurveyQuestion question);

    void updateQuestion(Long surveyId, Long questionId, String currentUserId, SurveyQuestion question);

    void updateQuestionOrder(Long surveyId, String currentUserId, List<Long> questionIds);

    SurveyQuestion copyQuestion(Long surveyId, Long questionId, String currentUserId);

    void deleteQuestion(Long surveyId, Long questionId, String currentUserId);
}
