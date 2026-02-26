package com.lx.questionnaire.service;

import com.lx.questionnaire.dto.FillSurveyVO;
import com.lx.questionnaire.dto.SubmitItemDTO;
import com.lx.questionnaire.dto.SubmitRequestDTO;

import java.util.List;

public interface FillService {

    /**
     * 获取填写页元数据，未通过校验时抛出 4xx 业务异常（SURVEY_NOT_FOUND / SURVEY_NOT_STARTED / SURVEY_ENDED / SURVEY_ALREADY_SUBMITTED）
     */
    FillSurveyVO getFillMetadata(String surveyId, String userId);

    /**
     * 预览用：仅问卷创建者可用，允许草稿状态返回填写页元数据（不校验状态、时间、限填）。
     */
    FillSurveyVO getFillMetadataForPreview(String surveyId, String userId);

    /**
     * 提交答卷，校验同 getFillMetadata，通过后写入 response + response_item。
     * 若该设备已有草稿则更新为已提交，否则新增。
     * @param clientIp 提交时客户端 IP，用于按 IP 限填
     */
    void submit(String surveyId, String userId, SubmitRequestDTO request, String clientIp);

    /**
     * 保存填写草稿（实时保存），不校验必填。
     * 允许匿名：按 surveyId+deviceId 唯一；不允许匿名：按 surveyId+userId 唯一。
     */
    void saveDraft(String surveyId, String userId, String deviceId, List<SubmitItemDTO> items);

    /**
     * 获取草稿。允许匿名：按 surveyId+deviceId 查；不允许匿名：按 surveyId+userId 查。无则返回 null。
     */
    List<SubmitItemDTO> getDraft(String surveyId, String userId, String deviceId);
}
