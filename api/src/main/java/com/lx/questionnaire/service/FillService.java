package com.lx.questionnaire.service;

import com.lx.questionnaire.dto.FillSurveyVO;
import com.lx.questionnaire.dto.SubmitRequestDTO;

public interface FillService {

    /**
     * 获取填写页元数据，未通过校验时抛出 4xx 业务异常（SURVEY_NOT_FOUND / SURVEY_NOT_STARTED / SURVEY_ENDED / SURVEY_ALREADY_SUBMITTED）
     */
    FillSurveyVO getFillMetadata(String surveyId, String userId);

    /**
     * 提交答卷，校验同 getFillMetadata，通过后写入 response + response_item
     */
    void submit(String surveyId, String userId, SubmitRequestDTO request);
}
