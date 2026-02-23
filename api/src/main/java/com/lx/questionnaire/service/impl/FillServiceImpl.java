package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.dto.FillSurveyVO;
import com.lx.questionnaire.dto.SubmitItemDTO;
import com.lx.questionnaire.dto.SubmitRequestDTO;
import com.lx.questionnaire.entity.Response;
import com.lx.questionnaire.entity.ResponseItem;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import com.lx.questionnaire.mapper.ResponseItemMapper;
import com.lx.questionnaire.mapper.ResponseMapper;
import com.lx.questionnaire.mapper.SurveyMapper;
import com.lx.questionnaire.mapper.SurveyQuestionMapper;
import com.lx.questionnaire.service.FillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FillServiceImpl implements FillService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_COLLECTING = "COLLECTING";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final String VALUE_TYPE_OPTION = "OPTION";
    private static final String VALUE_TYPE_TEXT = "TEXT";
    private static final String VALUE_TYPE_SCALE = "SCALE";

    private final SurveyMapper surveyMapper;
    private final SurveyQuestionMapper surveyQuestionMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final ObjectMapper objectMapper;

    @Override
    public FillSurveyVO getFillMetadata(Long surveyId, String userId) {
        Survey s = surveyMapper.selectById(surveyId);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        if (STATUS_DRAFT.equals(s.getStatus())) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_STARTED);
        }
        if (STATUS_ENDED.equals(s.getStatus()) || STATUS_PAUSED.equals(s.getStatus())) {
            throw new BusinessException(ErrorCode.SURVEY_ENDED);
        }
        LocalDateTime now = LocalDateTime.now();
        if (s.getStartTime() != null && now.isBefore(s.getStartTime())) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_STARTED);
        }
        if (s.getEndTime() != null && now.isAfter(s.getEndTime())) {
            throw new BusinessException(ErrorCode.SURVEY_ENDED);
        }
        if (Boolean.TRUE.equals(s.getLimitOncePerUser()) && userId != null) {
            long count = responseMapper.selectCount(new LambdaQueryWrapper<Response>()
                    .eq(Response::getSurveyId, surveyId).eq(Response::getUserId, userId));
            if (count > 0) {
                throw new BusinessException(ErrorCode.SURVEY_ALREADY_SUBMITTED);
            }
        }
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        return FillSurveyVO.from(s, questions);
    }

    @Override
    @Transactional
    public void submit(Long surveyId, String userId, SubmitRequestDTO request) {
        getFillMetadata(surveyId, userId);

        Response r = new Response();
        r.setSurveyId(surveyId);
        r.setUserId(userId);
        r.setSubmittedAt(LocalDateTime.now());
        r.setDurationSeconds(request.getDurationSeconds());
        responseMapper.insert(r);

        if (request.getItems() != null) {
            for (SubmitItemDTO item : request.getItems()) {
                if (item.getQuestionId() == null) continue;
                ResponseItem ri = new ResponseItem();
                ri.setResponseId(r.getId());
                ri.setQuestionId(item.getQuestionId());
                if (item.getOptionIndex() != null) {
                    ri.setValueType(VALUE_TYPE_OPTION);
                    ri.setOptionIndex(item.getOptionIndex());
                } else if (item.getOptionIndices() != null && item.getOptionIndices().length > 0) {
                    ri.setValueType(VALUE_TYPE_OPTION);
                    ri.setOptionIndices(toJsonArray(item.getOptionIndices()));
                } else if (item.getTextValue() != null) {
                    ri.setValueType(VALUE_TYPE_TEXT);
                    ri.setTextValue(item.getTextValue());
                } else if (item.getScaleValue() != null) {
                    ri.setValueType(VALUE_TYPE_SCALE);
                    ri.setScaleValue(item.getScaleValue());
                } else {
                    continue;
                }
                responseItemMapper.insert(ri);
            }
        }
    }

    private String toJsonArray(int[] arr) {
        try {
            return objectMapper.writeValueAsString(arr);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
