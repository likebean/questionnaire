package com.lx.questionnaire.service;

import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;

import java.util.List;

public interface SurveyService {

    SurveyListResponse list(String currentUserId, Boolean onlyMine, String status, String keyword, int page, int pageSize, String sort);

    Survey create(String creatorId, String title, String description);

    SurveyDetailVO getDetail(String id, String currentUserId);

    void updateBasic(String id, String currentUserId, String title, String description);

    void updateSettings(String id, String currentUserId, Boolean limitOncePerUser, Boolean allowAnonymous,
                        java.time.LocalDateTime startTime, java.time.LocalDateTime endTime, String thankYouText,
                        Integer limitByIp, Integer limitByDevice);

    void publish(String id, String currentUserId);

    void pause(String id, String currentUserId);

    void resume(String id, String currentUserId);

    void end(String id, String currentUserId);

    Survey copy(String id, String currentUserId);

    void delete(String id, String currentUserId);

    String getFillUrl(String id);

    List<SurveyQuestion> listQuestions(String surveyId, String currentUserId);

    SurveyQuestion addQuestion(String surveyId, String currentUserId, SurveyQuestion question);

    void updateQuestion(String surveyId, Long questionId, String currentUserId, SurveyQuestion question);

    void updateQuestionOrder(String surveyId, String currentUserId, List<Long> questionIds);

    SurveyQuestion copyQuestion(String surveyId, Long questionId, String currentUserId);

    void deleteQuestion(String surveyId, Long questionId, String currentUserId);

    ResponseListResponse listResponses(String surveyId, String currentUserId, int page, int pageSize);

    ResponseDetailVO getResponseDetail(String surveyId, Long responseId, String currentUserId);

    AnalyticsResponse getAnalytics(String surveyId, String currentUserId);

    byte[] exportResponses(String surveyId, String currentUserId);
}
