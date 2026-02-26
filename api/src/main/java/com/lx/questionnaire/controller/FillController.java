package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.dto.FillSurveyVO;
import com.lx.questionnaire.dto.SubmitItemDTO;
import com.lx.questionnaire.dto.SubmitRequestDTO;

import java.util.List;
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

    /**
     * 获取该问卷该设备的草稿。权限同填写页（允许匿名时可不登录）。
     */
    @GetMapping("/{id}/draft")
    public Result<List<SubmitItemDTO>> getDraft(
            @PathVariable String id, @RequestParam(required = false) String deviceId) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        String userId = SecurityUtils.getCurrentUserId();
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        List<SubmitItemDTO> draft = fillService.getDraft(id, userId, deviceId);
        return Result.ok(draft != null ? draft : List.of());
    }

    /**
     * 保存草稿（实时保存）。body 含 items、deviceId。权限同填写页。
     */
    @PostMapping("/{id}/draft")
    public Result<Void> saveDraft(@PathVariable String id, @RequestBody SubmitRequestDTO request) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        String userId = SecurityUtils.getCurrentUserId();
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        String deviceId = request != null ? request.getDeviceId() : null;
        if (Boolean.TRUE.equals(s.getAllowAnonymous()) && (deviceId == null || deviceId.isBlank())) return Result.ok();
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && (userId == null || userId.isBlank())) return Result.ok();
        fillService.saveDraft(id, userId, deviceId, request != null ? request.getItems() : null);
        return Result.ok();
    }

    /**
     * 获取填写页元数据。允许匿名时未登录也可访问；否则需登录。
     * @param preview 为 true 时：仅问卷创建者可用，且允许草稿问卷返回元数据（用于设计时预览）。
     * 注：单段路径 /{id} 放在最后，避免与 /{id}/draft、/{id}/submit 等多段路径冲突。
     */
    @GetMapping("/{id}")
    public Result<FillSurveyVO> getFillMetadata(@PathVariable String id,
                                                @RequestParam(required = false) Boolean preview,
                                                HttpServletRequest request) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        String userId = SecurityUtils.getCurrentUserId();
        String previewRaw = request.getParameter("preview");
        boolean isPreview = Boolean.TRUE.equals(preview) || "1".equals(previewRaw) || "true".equalsIgnoreCase(previewRaw);
        if (isPreview) {
            if (userId == null || userId.isBlank()) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            if (!userId.equals(s.getCreatorId())) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
            return Result.ok(fillService.getFillMetadataForPreview(id, userId));
        }
        if (!Boolean.TRUE.equals(s.getAllowAnonymous()) && userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return Result.ok(fillService.getFillMetadata(id, userId));
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
