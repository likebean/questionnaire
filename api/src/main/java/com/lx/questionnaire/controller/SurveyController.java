package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import com.lx.questionnaire.service.SurveyService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(required = false) Boolean onlyMine,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(defaultValue = "updatedAt") String sort) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.list(userId, onlyMine, status, keyword, page, pageSize, sort));
    }

    @PostMapping
    public Result<Survey> create(@RequestBody Map<String, String> body) {
        String userId = SecurityUtils.getCurrentUserId();
        String title = body != null ? body.get("title") : null;
        String description = body != null ? body.get("description") : null;
        return Result.ok(surveyService.create(userId, title, description));
    }

    @GetMapping("/{id}")
    public Result<SurveyDetailVO> getDetail(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.getDetail(id, userId));
    }

    @PutMapping("/{id}")
    public Result<Void> updateBasic(@PathVariable String id, @RequestBody Map<String, String> body) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateBasic(id, userId, body != null ? body.get("title") : null, body != null ? body.get("description") : null);
        return Result.ok();
    }

    @PutMapping("/{id}/settings")
    public Result<Void> updateSettings(@PathVariable String id, @RequestBody(required = false) UpdateSettingsDTO dto) {
        String userId = SecurityUtils.getCurrentUserId();
        if (dto == null) dto = new UpdateSettingsDTO();
        surveyService.updateSettings(id, userId, dto.getLimitOncePerUser(), dto.getAllowAnonymous(),
                dto.getStartTime(), dto.getEndTime(), dto.getThankYouText());
        return Result.ok();
    }

    @PostMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.publish(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/pause")
    public Result<Void> pause(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.pause(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/resume")
    public Result<Void> resume(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.resume(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/end")
    public Result<Void> end(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.end(id, userId);
        return Result.ok();
    }

    @PostMapping("/{id}/copy")
    public Result<Survey> copy(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.copy(id, userId));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.delete(id, userId);
        return Result.ok();
    }

    @GetMapping("/{id}/fill-url")
    public Result<Map<String, String>> getFillUrl(@PathVariable String id) {
        String path = surveyService.getFillUrl(id);
        return Result.ok(Map.of("fillUrl", path));
    }

    // ---------- 题目 ----------
    @GetMapping("/{surveyId}/questions")
    public Result<List<SurveyQuestion>> listQuestions(@PathVariable String surveyId) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.listQuestions(surveyId, userId));
    }

    @PostMapping("/{surveyId}/questions")
    public Result<SurveyQuestion> addQuestion(@PathVariable String surveyId, @RequestBody SurveyQuestion question) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.addQuestion(surveyId, userId, question));
    }

    @PutMapping("/{surveyId}/questions/{questionId}")
    public Result<Void> updateQuestion(@PathVariable String surveyId, @PathVariable Long questionId, @RequestBody SurveyQuestion question) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateQuestion(surveyId, questionId, userId, question);
        return Result.ok();
    }

    @PutMapping("/{surveyId}/questions/order")
    public Result<Void> updateQuestionOrder(@PathVariable String surveyId, @RequestBody List<Long> questionIds) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.updateQuestionOrder(surveyId, userId, questionIds);
        return Result.ok();
    }

    @PostMapping("/{surveyId}/questions/{questionId}/copy")
    public Result<SurveyQuestion> copyQuestion(@PathVariable String surveyId, @PathVariable Long questionId) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.copyQuestion(surveyId, questionId, userId));
    }

    @DeleteMapping("/{surveyId}/questions/{questionId}")
    public Result<Void> deleteQuestion(@PathVariable String surveyId, @PathVariable Long questionId) {
        String userId = SecurityUtils.getCurrentUserId();
        surveyService.deleteQuestion(surveyId, questionId, userId);
        return Result.ok();
    }

    // ---------- 答卷与统计 ----------
    @GetMapping("/{id}/responses")
    public Result<ResponseListResponse> listResponses(
            @PathVariable String id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.listResponses(id, userId, page, pageSize));
    }

    @GetMapping("/{surveyId}/responses/{responseId}")
    public Result<ResponseDetailVO> getResponseDetail(@PathVariable String surveyId, @PathVariable Long responseId) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.getResponseDetail(surveyId, responseId, userId));
    }

    @GetMapping("/{id}/analytics")
    public Result<AnalyticsResponse> getAnalytics(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        return Result.ok(surveyService.getAnalytics(id, userId));
    }

    @GetMapping(value = "/{id}/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportResponses(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        byte[] body = surveyService.exportResponses(id, userId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"responses-" + id + ".xlsx\"");
        return ResponseEntity.ok().headers(headers).body(body);
    }
}
