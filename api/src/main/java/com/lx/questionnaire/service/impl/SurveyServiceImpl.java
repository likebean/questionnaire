package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import com.lx.questionnaire.mapper.ResponseMapper;
import com.lx.questionnaire.mapper.SurveyMapper;
import com.lx.questionnaire.mapper.SurveyQuestionMapper;
import com.lx.questionnaire.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyServiceImpl implements SurveyService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_COLLECTING = "COLLECTING";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";

    private final SurveyMapper surveyMapper;
    private final SurveyQuestionMapper surveyQuestionMapper;
    private final ResponseMapper responseMapper;

    private void requireCreator(Survey s, String currentUserId) {
        if (currentUserId == null || !currentUserId.equals(s.getCreatorId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private Survey requireSurvey(Long id) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        return s;
    }

    @Override
    public SurveyListResponse list(String creatorId, String status, String keyword, int page, int pageSize, String sort) {
        LambdaQueryWrapper<Survey> q = new LambdaQueryWrapper<>();
        q.eq(Survey::getCreatorId, creatorId);
        if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
            q.eq(Survey::getStatus, status);
        }
        if (keyword != null && !keyword.isEmpty()) {
            q.like(Survey::getTitle, keyword);
        }
        boolean useCreated = "createdAt".equalsIgnoreCase(sort);
        q.orderBy(true, false, useCreated ? Survey::getCreatedAt : Survey::getUpdatedAt);
        Page<Survey> p = new Page<>(page, pageSize);
        Page<Survey> result = surveyMapper.selectPage(p, q);
        List<SurveyListItemVO> list = new ArrayList<>();
        for (Survey s : result.getRecords()) {
            SurveyListItemVO vo = new SurveyListItemVO();
            vo.setId(s.getId());
            vo.setTitle(s.getTitle());
            vo.setStatus(s.getStatus());
            vo.setUpdatedAt(s.getUpdatedAt());
            vo.setCreatedAt(s.getCreatedAt());
            Long count = responseMapper.selectCount(new LambdaQueryWrapper<com.lx.questionnaire.entity.Response>()
                    .eq(com.lx.questionnaire.entity.Response::getSurveyId, s.getId()));
            vo.setResponseCount(count);
            list.add(vo);
        }
        return new SurveyListResponse(list, result.getTotal());
    }

    @Override
    @Transactional
    public Survey create(String creatorId, String title, String description) {
        Survey s = new Survey();
        s.setTitle(title != null ? title : "未命名问卷");
        s.setDescription(description);
        s.setStatus(STATUS_DRAFT);
        s.setCreatorId(creatorId);
        s.setLimitOncePerUser(true);
        s.setAllowAnonymous(false);
        surveyMapper.insert(s);
        return s;
    }

    @Override
    public SurveyDetailVO getDetail(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, id).orderByAsc(SurveyQuestion::getSortOrder));
        return SurveyDetailVO.from(s, questions);
    }

    @Override
    public void updateBasic(Long id, String currentUserId, String title, String description) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (title != null) s.setTitle(title);
        if (description != null) s.setDescription(description);
        surveyMapper.updateById(s);
    }

    @Override
    public void updateSettings(Long id, String currentUserId, Boolean limitOncePerUser, Boolean allowAnonymous,
                               LocalDateTime startTime, LocalDateTime endTime, String thankYouText) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (limitOncePerUser != null) s.setLimitOncePerUser(limitOncePerUser);
        if (allowAnonymous != null) s.setAllowAnonymous(allowAnonymous);
        if (startTime != null) s.setStartTime(startTime);
        if (endTime != null) s.setEndTime(endTime);
        if (thankYouText != null) s.setThankYouText(thankYouText);
        surveyMapper.updateById(s);
    }

    @Override
    @Transactional
    public void publish(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (!STATUS_DRAFT.equals(s.getStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR);
        }
        long count = surveyQuestionMapper.selectCount(new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, id));
        if (count == 0) {
            throw new BusinessException(ErrorCode.fail(1002, "请至少添加一道题目"));
        }
        s.setStatus(STATUS_COLLECTING);
        surveyMapper.updateById(s);
    }

    @Override
    public void pause(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (!STATUS_COLLECTING.equals(s.getStatus())) throw new BusinessException(ErrorCode.PARAM_ERROR);
        s.setStatus(STATUS_PAUSED);
        surveyMapper.updateById(s);
    }

    @Override
    public void resume(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (!STATUS_PAUSED.equals(s.getStatus())) throw new BusinessException(ErrorCode.PARAM_ERROR);
        s.setStatus(STATUS_COLLECTING);
        surveyMapper.updateById(s);
    }

    @Override
    public void end(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        if (STATUS_ENDED.equals(s.getStatus())) return;
        s.setStatus(STATUS_ENDED);
        surveyMapper.updateById(s);
    }

    @Override
    @Transactional
    public Survey copy(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        Survey copy = new Survey();
        copy.setTitle(s.getTitle() + " (副本)");
        copy.setDescription(s.getDescription());
        copy.setStatus(STATUS_DRAFT);
        copy.setCreatorId(currentUserId);
        copy.setLimitOncePerUser(s.getLimitOncePerUser());
        copy.setAllowAnonymous(s.getAllowAnonymous());
        copy.setStartTime(s.getStartTime());
        copy.setEndTime(s.getEndTime());
        copy.setThankYouText(s.getThankYouText());
        surveyMapper.insert(copy);
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, id).orderByAsc(SurveyQuestion::getSortOrder));
        for (SurveyQuestion q : questions) {
            SurveyQuestion nq = new SurveyQuestion();
            nq.setSurveyId(copy.getId());
            nq.setSortOrder(q.getSortOrder());
            nq.setType(q.getType());
            nq.setTitle(q.getTitle());
            nq.setDescription(q.getDescription());
            nq.setRequired(q.getRequired());
            nq.setConfig(q.getConfig());
            surveyQuestionMapper.insert(nq);
        }
        return copy;
    }

    @Override
    public void delete(Long id, String currentUserId) {
        Survey s = requireSurvey(id);
        requireCreator(s, currentUserId);
        surveyMapper.deleteById(id);
    }

    @Override
    public String getFillUrl(Long id) {
        Survey s = requireSurvey(id);
        return "/fill/" + id;
    }

    @Override
    public List<SurveyQuestion> listQuestions(Long surveyId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        return surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
    }

    @Override
    public SurveyQuestion addQuestion(Long surveyId, String currentUserId, SurveyQuestion question) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        question.setSurveyId(surveyId);
        if (question.getSortOrder() == null) {
            Integer maxOrder = surveyQuestionMapper.selectList(
                    new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId))
                    .stream().map(SurveyQuestion::getSortOrder).max(Integer::compareTo).orElse(-1);
            question.setSortOrder(maxOrder + 1);
        }
        surveyQuestionMapper.insert(question);
        return question;
    }

    @Override
    public void updateQuestion(Long surveyId, Long questionId, String currentUserId, SurveyQuestion question) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        SurveyQuestion existing = surveyQuestionMapper.selectOne(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).eq(SurveyQuestion::getId, questionId));
        if (existing == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        if (question.getTitle() != null) existing.setTitle(question.getTitle());
        if (question.getDescription() != null) existing.setDescription(question.getDescription());
        if (question.getType() != null) existing.setType(question.getType());
        if (question.getRequired() != null) existing.setRequired(question.getRequired());
        if (question.getConfig() != null) existing.setConfig(question.getConfig());
        surveyQuestionMapper.updateById(existing);
    }

    @Override
    public void updateQuestionOrder(Long surveyId, String currentUserId, List<Long> questionIds) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        for (int i = 0; i < questionIds.size(); i++) {
            SurveyQuestion q = surveyQuestionMapper.selectById(questionIds.get(i));
            if (q != null && q.getSurveyId().equals(surveyId)) {
                q.setSortOrder(i);
                surveyQuestionMapper.updateById(q);
            }
        }
    }

    @Override
    @Transactional
    public SurveyQuestion copyQuestion(Long surveyId, Long questionId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        SurveyQuestion src = surveyQuestionMapper.selectOne(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).eq(SurveyQuestion::getId, questionId));
        if (src == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        List<SurveyQuestion> after = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId)
                        .gt(SurveyQuestion::getSortOrder, src.getSortOrder()).orderByAsc(SurveyQuestion::getSortOrder));
        SurveyQuestion nq = new SurveyQuestion();
        nq.setSurveyId(surveyId);
        nq.setSortOrder(src.getSortOrder() + 1);
        nq.setType(src.getType());
        nq.setTitle(src.getTitle());
        nq.setDescription(src.getDescription());
        nq.setRequired(src.getRequired());
        nq.setConfig(src.getConfig());
        surveyQuestionMapper.insert(nq);
        for (SurveyQuestion q : after) {
            q.setSortOrder(q.getSortOrder() + 1);
            surveyQuestionMapper.updateById(q);
        }
        return nq;
    }

    @Override
    public void deleteQuestion(Long surveyId, Long questionId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        requireCreator(s, currentUserId);
        surveyQuestionMapper.delete(new LambdaQueryWrapper<SurveyQuestion>()
                .eq(SurveyQuestion::getSurveyId, surveyId).eq(SurveyQuestion::getId, questionId));
    }
}
