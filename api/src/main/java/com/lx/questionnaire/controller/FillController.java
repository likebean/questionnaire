package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.dto.FillSurveyVO;
import com.lx.questionnaire.dto.SubmitRequestDTO;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.mapper.SurveyMapper;
import com.lx.questionnaire.service.FillService;
import com.lx.questionnaire.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fill")
@RequiredArgsConstructor
public class FillController {

    private final FillService fillService;
    private final SurveyMapper surveyMapper;

    /**
     * 获取填写页元数据。允许匿名时未登录也可访问；否则需登录。
     */
    @GetMapping("/{id}")
    public Result<FillSurveyVO> getFillMetadata(@PathVariable String id) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        String userId = SecurityUtils.getCurrentUserId();
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return Result.ok(fillService.getFillMetadata(id, userId));
    }

    /**
     * 提交答卷。允许匿名时未登录也可提交（userId 为 null）；否则需登录。
     */
    @PostMapping("/{id}/submit")
    public Result<Void> submit(@PathVariable String id, @RequestBody SubmitRequestDTO request,
                               HttpServletRequest httpRequest) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        String userId = SecurityUtils.getCurrentUserId();
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        String clientIp = getClientIp(httpRequest);
        fillService.submit(id, userId, request, clientIp);
        return Result.ok();
    }

    private static String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }
}
