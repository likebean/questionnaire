package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.dto.SurveyDetailVO;
import com.lx.questionnaire.dto.SurveyListResponse;
import com.lx.questionnaire.dto.UpdateSettingsDTO;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import com.lx.questionnaire.service.SurveyService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService surveyService;

    @GetMapping
    public Result<SurveyListResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(defaultValue = "updatedAt") String sort) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.list(userId, status, keyword, page, pageSize, sort));
    }

    @PostMapping
    public Result<Survey> create(@RequestBody Map<String, String> body) {
        String userId = SecurityUtils.getCurrentUserId();
        String title = body != null ? body.get("title") : null;
        String description = body != null ? body.get("description") : null;
        return Result.ok(surveyService.create(userId, title, description));
    }

    @GetMapping("/{id}")
    public Result<SurveyDetailVO> getDetail(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.getDetail(id, userId));
    }

    @PutMapping("/{id}")
    public Result<Void> updateBasic(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateBasic(id, userId, body != null ? body.get("title") : null, body != null ? body.get("description") : null);
        return Result.ok();
    }

    @PutMapping("/{id}/settings")
    public Result<Void> updateSettings(@PathVariable Long id, @RequestBody(required = false) UpdateSettingsDTO dto) {
        String userId = SecurityUtils.getCurrentUserId();
        if (dto == null) dto = new UpdateSettingsDTO();
        surveyService.updateSettings(id, userId, dto.getLimitOncePerUser(), dto.getAllowAnonymous(),
                dto.getStartTime(), dto.getEndTime(), dto.getThankYouText());
        return Result.ok();
    }

    @PostMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.publish(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/pause")
    public Result<Void> pause(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.pause(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/resume")
    public Result<Void> resume(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.resume(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/end")
    public Result<Void> end(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.end(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/copy")
    public Result<Survey> copy(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.copy(id, userId));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.delete(id, userId);
        return Result.ok();
    }

    @GetMapping("/{id}/fill-url")
    public Result<Map<String, String>> getFillUrl(@PathVariable Long id) {
        String path = surveyService.getFillUrl(id);
        return Result.ok(Map.of("fillUrl", path));
    }

    // ---------- 题目 ----------
    @GetMapping("/{surveyId}/questions")
    public Result<List<SurveyQuestion>> listQuestions(@PathVariable Long surveyId) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.listQuestions(surveyId, userId));
    }

    @PostMapping("/{surveyId}/questions")
    public Result<SurveyQuestion> addQuestion(@PathVariable Long surveyId, @RequestBody SurveyQuestion question) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.addQuestion(surveyId, userId, question));
    }

    @PutMapping("/{surveyId}/questions/{questionId}")
    public Result<Void> updateQuestion(@PathVariable Long surveyId, @PathVariable Long questionId, @RequestBody SurveyQuestion question) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateQuestion(surveyId, questionId, userId, question);
        return Result.ok();
    }

    @PutMapping("/{surveyId}/questions/order")
    public Result<Void> updateQuestionOrder(@PathVariable Long surveyId, @RequestBody List<Long> questionIds) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateQuestionOrder(surveyId, userId, questionIds);
        return Result.ok();
    }

    @PostMapping("/{surveyId}/questions/{questionId}/copy")
    public Result<SurveyQuestion> copyQuestion(@PathVariable Long surveyId, @PathVariable Long questionId) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.copyQuestion(surveyId, questionId, userId));
    }

    @DeleteMapping("/{surveyId}/questions/{questionId}")
    public Result<Void> deleteQuestion(@PathVariable Long surveyId, @PathVariable Long questionId) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.deleteQuestion(surveyId, questionId, userId);
        return Result.ok();
    }
}
