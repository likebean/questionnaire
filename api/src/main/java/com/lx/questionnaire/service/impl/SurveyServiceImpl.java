package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.SurveyQuestion;
import com.fasterxml.jackson.databind.JsonNode;
import com.lx.questionnaire.entity.Response;
import com.lx.questionnaire.entity.ResponseItem;
import com.lx.questionnaire.mapper.ResponseItemMapper;
import com.lx.questionnaire.mapper.ResponseMapper;
import com.lx.questionnaire.mapper.SurveyMapper;
import com.lx.questionnaire.mapper.SurveyQuestionMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.service.SurveyPermissionService;
import com.lx.questionnaire.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

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
    private final ResponseItemMapper responseItemMapper;
    private final UserMapper userMapper;
    private final SurveyPermissionService surveyPermissionService;
    private static final com.fasterxml.jackson.databind.ObjectMapper JSON = new com.fasterxml.jackson.databind.ObjectMapper();

    private Survey requireSurvey(String id) {
        Survey s = surveyMapper.selectById(id);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        return s;
    }

    @Override
    public SurveyListResponse list(String currentUserId, Boolean onlyMine, String status, String keyword, int page, int pageSize, String sort) {
        LambdaQueryWrapper<Survey> q = new LambdaQueryWrapper<>();
        if (Boolean.TRUE.equals(onlyMine)) {
            q.eq(Survey::getCreatorId, currentUserId);
        } else {
            SurveyListFilter filter = surveyPermissionService.getSurveyViewListFilter(currentUserId);
            if (filter.isAllowAll()) {
                // 全校，不限制
            } else if (!filter.isAllowAll() && filter.getCreatorId() == null && filter.getDepartmentId() == null) {
                return new SurveyListResponse(List.of(), 0L);
            } else if (filter.getCreatorId() != null && filter.getDepartmentId() != null) {
                q.and(w -> w.eq(Survey::getCreatorId, filter.getCreatorId()).or().eq(Survey::getDepartmentId, filter.getDepartmentId()));
            } else if (filter.getCreatorId() != null) {
                q.eq(Survey::getCreatorId, filter.getCreatorId());
            } else {
                q.eq(Survey::getDepartmentId, filter.getDepartmentId());
            }
        }
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
                    .eq(com.lx.questionnaire.entity.Response::getSurveyId, s.getId())
                    .eq(com.lx.questionnaire.entity.Response::getStatus, "SUBMITTED"));
            vo.setResponseCount(count);
            list.add(vo);
        }
        return new SurveyListResponse(list, result.getTotal());
    }

    @Override
    @Transactional
    public Survey create(String creatorId, String title, String description) {
        surveyPermissionService.requirePermission(creatorId, "survey", null, "create");
        Survey s = new Survey();
        s.setId(UUID.randomUUID().toString());
        s.setTitle(title != null ? title : "未命名问卷");
        s.setDescription(description);
        s.setStatus(STATUS_DRAFT);
        s.setCreatorId(creatorId);
        com.lx.questionnaire.entity.User creator = userMapper.selectById(creatorId);
        s.setDepartmentId(creator != null ? creator.getDepartmentId() : null);
        s.setLimitOncePerUser(true);
        s.setAllowAnonymous(false);
        surveyMapper.insert(s);
        return s;
    }

    @Override
    public SurveyDetailVO getDetail(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "view");
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, id).orderByAsc(SurveyQuestion::getSortOrder));
        return SurveyDetailVO.from(s, questions);
    }

    @Override
    public void updateBasic(String id, String currentUserId, String title, String description) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
        if (title != null) s.setTitle(title);
        if (description != null) s.setDescription(description);
        surveyMapper.updateById(s);
    }

    @Override
    public void updateSettings(String id, String currentUserId, Boolean limitOncePerUser, Boolean allowAnonymous,
                               LocalDateTime startTime, LocalDateTime endTime, String thankYouText,
                               Integer limitByIp, Integer limitByDevice) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
        if (limitOncePerUser != null) s.setLimitOncePerUser(limitOncePerUser);
        if (allowAnonymous != null) s.setAllowAnonymous(allowAnonymous);
        if (startTime != null) s.setStartTime(startTime);
        if (endTime != null) s.setEndTime(endTime);
        if (thankYouText != null) s.setThankYouText(thankYouText);
        if (limitByIp != null) s.setLimitByIp(limitByIp);
        if (limitByDevice != null) s.setLimitByDevice(limitByDevice);
        surveyMapper.updateById(s);
    }

    @Override
    @Transactional
    public void publish(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "publish");
        if (!STATUS_DRAFT.equals(s.getStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR);
        }
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, id).orderByAsc(SurveyQuestion::getSortOrder));
        if (questions.isEmpty()) {
            throw new BusinessException(ErrorCode.fail(1002, "请至少添加一道题目"));
        }
        for (SurveyQuestion q : questions) {
            if (q.getTitle() == null || q.getTitle().isBlank()) {
                throw new BusinessException(ErrorCode.fail(1002, "请填写题目标题（题目" + (q.getSortOrder() + 1) + "）"));
            }
            if ("SINGLE_CHOICE".equals(q.getType()) || "MULTIPLE_CHOICE".equals(q.getType())) {
                if (q.getConfig() == null || !q.getConfig().contains("\"options\"") || !q.getConfig().contains("[")) {
                    throw new BusinessException(ErrorCode.fail(1002, "单选题/多选题至少需要一个选项（题目：" + q.getTitle() + "）"));
                }
                try {
                    com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(q.getConfig());
                    com.fasterxml.jackson.databind.JsonNode opts = node.get("options");
                    if (opts == null || !opts.isArray() || opts.size() == 0) {
                        throw new BusinessException(ErrorCode.fail(1002, "单选题/多选题至少需要一个选项（题目：" + q.getTitle() + "）"));
                    }
                } catch (Exception e) {
                    if (e instanceof BusinessException) throw (BusinessException) e;
                    throw new BusinessException(ErrorCode.fail(1002, "题目配置无效（题目：" + q.getTitle() + "）"));
                }
            }
        }
        s.setStatus(STATUS_COLLECTING);
        surveyMapper.updateById(s);
    }

    @Override
    public void pause(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "publish");
        if (!STATUS_COLLECTING.equals(s.getStatus())) throw new BusinessException(ErrorCode.PARAM_ERROR);
        s.setStatus(STATUS_PAUSED);
        surveyMapper.updateById(s);
    }

    @Override
    public void resume(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "publish");
        if (!STATUS_PAUSED.equals(s.getStatus())) throw new BusinessException(ErrorCode.PARAM_ERROR);
        s.setStatus(STATUS_COLLECTING);
        surveyMapper.updateById(s);
    }

    @Override
    public void end(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "publish");
        if (STATUS_ENDED.equals(s.getStatus())) return;
        s.setStatus(STATUS_ENDED);
        surveyMapper.updateById(s);
    }

    @Override
    @Transactional
    public Survey copy(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "view");
        Survey copy = new Survey();
        copy.setId(UUID.randomUUID().toString());
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
    public void delete(String id, String currentUserId) {
        Survey s = requireSurvey(id);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "delete");
        surveyMapper.deleteById(id);
    }

    @Override
    public String getFillUrl(String id) {
        Survey s = requireSurvey(id);
        return "/fill/" + id;
    }

    @Override
    public List<SurveyQuestion> listQuestions(String surveyId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
        return surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
    }

    @Override
    public SurveyQuestion addQuestion(String surveyId, String currentUserId, SurveyQuestion question) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
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
    public void updateQuestion(String surveyId, Long questionId, String currentUserId, SurveyQuestion question) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
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
    public void updateQuestionOrder(String surveyId, String currentUserId, List<Long> questionIds) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
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
    public SurveyQuestion copyQuestion(String surveyId, Long questionId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
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
    public void deleteQuestion(String surveyId, Long questionId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "survey", s, "edit");
        surveyQuestionMapper.delete(new LambdaQueryWrapper<SurveyQuestion>()
                .eq(SurveyQuestion::getSurveyId, surveyId).eq(SurveyQuestion::getId, questionId));
    }

    @Override
    public ResponseListResponse listResponses(String surveyId, String currentUserId, int page, int pageSize) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "response", s, "view");
        long total = responseMapper.selectCount(
                new LambdaQueryWrapper<Response>().eq(Response::getSurveyId, surveyId).eq(Response::getStatus, "SUBMITTED"));
        long offset = (long) (page - 1) * pageSize;
        List<Response> records = responseMapper.selectPageBySurveyId(surveyId, offset, pageSize);
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        Map<Long, SurveyQuestion> qMap = questions.stream().collect(Collectors.toMap(SurveyQuestion::getId, x -> x));
        List<ResponseListItemVO> list = new ArrayList<>();
        for (Response r : records) {
            ResponseListItemVO vo = new ResponseListItemVO();
            vo.setId(r.getId());
            vo.setUserId(r.getUserId());
            vo.setSubmittedAt(r.getSubmittedAt());
            vo.setDurationSeconds(r.getDurationSeconds());
            List<ResponseItem> items = responseItemMapper.selectList(
                    new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, r.getId()));
            List<String> parts = new ArrayList<>();
            for (int i = 0; i < Math.min(2, questions.size()); i++) {
                SurveyQuestion q = questions.get(i);
                ResponseItem item = items.stream().filter(x -> x.getQuestionId().equals(q.getId())).findFirst().orElse(null);
                if (item != null) parts.add(formatAnswerShort(item, q));
            }
            vo.setSummary(parts.isEmpty() ? null : String.join("；", parts));
            list.add(vo);
        }
        return new ResponseListResponse(list, total);
    }

    @Override
    public ResponseDetailVO getResponseDetail(String surveyId, Long responseId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "response", s, "view");
        Response r = responseMapper.selectOne(new LambdaQueryWrapper<Response>()
                .eq(Response::getSurveyId, surveyId).eq(Response::getId, responseId).eq(Response::getStatus, "SUBMITTED"));
        if (r == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        Map<Long, SurveyQuestion> qMap = questions.stream().collect(Collectors.toMap(SurveyQuestion::getId, x -> x));
        List<ResponseItem> items = responseItemMapper.selectList(
                new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, responseId));
        ResponseDetailVO vo = new ResponseDetailVO();
        vo.setId(r.getId());
        vo.setUserId(r.getUserId());
        vo.setSubmittedAt(r.getSubmittedAt());
        vo.setDurationSeconds(r.getDurationSeconds());
        List<ResponseDetailItemVO> detailItems = new ArrayList<>();
        for (SurveyQuestion q : questions) {
            ResponseDetailItemVO di = new ResponseDetailItemVO();
            di.setQuestionId(q.getId());
            di.setQuestionTitle(q.getTitle());
            di.setType(q.getType());
            ResponseItem item = items.stream().filter(x -> x.getQuestionId().equals(q.getId())).findFirst().orElse(null);
            di.setAnswerText(item == null ? "—" : formatAnswerShort(item, q));
            if (item != null) {
                di.setOptionIndex(item.getOptionIndex());
                di.setTextValue(item.getTextValue());
                di.setScaleValue(item.getScaleValue());
                if (item.getOptionIndices() != null && !item.getOptionIndices().isEmpty()) {
                    try {
                        JsonNode arr = JSON.readTree(item.getOptionIndices());
                        List<Integer> indices = new ArrayList<>();
                        for (JsonNode n : arr) indices.add(n.asInt());
                        di.setOptionIndices(indices);
                    } catch (Exception ignored) { }
                }
            }
            detailItems.add(di);
        }
        vo.setItems(detailItems);
        return vo;
    }

    @Override
    public AnalyticsResponse getAnalytics(String surveyId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "response", s, "view");
        List<Long> submittedResponseIds = responseMapper.selectList(
                        new LambdaQueryWrapper<Response>().eq(Response::getSurveyId, surveyId).eq(Response::getStatus, "SUBMITTED"))
                .stream().map(Response::getId).collect(Collectors.toList());
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        List<AnalyticsQuestionVO> result = new ArrayList<>();
        for (SurveyQuestion q : questions) {
            AnalyticsQuestionVO aq = new AnalyticsQuestionVO();
            aq.setQuestionId(q.getId());
            aq.setType(q.getType());
            aq.setTitle(q.getTitle());
            List<ResponseItem> items = submittedResponseIds.isEmpty() ? List.of() : responseItemMapper.selectList(
                    new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getQuestionId, q.getId()).in(ResponseItem::getResponseId, submittedResponseIds));
            if (items.isEmpty()) {
                if ("SINGLE_CHOICE".equals(q.getType()) || "MULTIPLE_CHOICE".equals(q.getType())) aq.setSummary(new ArrayList<AnalyticsOptionSummary>());
                else if ("SCALE".equals(q.getType())) aq.setSummary(new com.lx.questionnaire.dto.AnalyticsScaleSummary());
                else aq.setSummary(new ArrayList<String>());
            } else if ("SINGLE_CHOICE".equals(q.getType()) || "MULTIPLE_CHOICE".equals(q.getType())) {
                aq.setSummary(buildOptionSummary(q, items));
            } else if ("SCALE".equals(q.getType())) {
                aq.setSummary(buildScaleSummary(items));
            } else {
                aq.setSummary(items.stream().map(ResponseItem::getTextValue).filter(Objects::nonNull).collect(Collectors.toList()));
            }
            result.add(aq);
        }
        return new AnalyticsResponse(result);
    }

    @Override
    public byte[] exportResponses(String surveyId, String currentUserId) {
        Survey s = requireSurvey(surveyId);
        surveyPermissionService.requirePermission(currentUserId, "response", s, "export");
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        List<Response> responses = responseMapper.selectList(
                new LambdaQueryWrapper<Response>().eq(Response::getSurveyId, surveyId).eq(Response::getStatus, "SUBMITTED").orderByAsc(Response::getSubmittedAt));
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        try (Workbook wb = new XSSFWorkbook()) {
            CellStyle textCellStyle = wb.createCellStyle();
            textCellStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("@"));

            Sheet sheet = wb.createSheet("答卷");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("提交时间");
            headerRow.createCell(1).setCellValue("用时(秒)");
            for (int i = 0; i < questions.size(); i++) {
                headerRow.createCell(2 + i).setCellValue(questions.get(i).getTitle() != null ? questions.get(i).getTitle() : "");
            }
            int rowNum = 1;
            for (Response r : responses) {
                List<ResponseItem> items = responseItemMapper.selectList(
                        new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, r.getId()));
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(r.getSubmittedAt() != null ? r.getSubmittedAt().format(dtf) : "");
                row.createCell(1).setCellValue(r.getDurationSeconds() != null ? r.getDurationSeconds() : 0);
                for (int i = 0; i < questions.size(); i++) {
                    SurveyQuestion q = questions.get(i);
                    ResponseItem item = items.stream().filter(x -> x.getQuestionId().equals(q.getId())).findFirst().orElse(null);
                    String cellValue = item == null ? "" : formatAnswerShort(item, q);
                    Cell cell = row.createCell(2 + i);
                    boolean isTextColumn = "SHORT_TEXT".equals(q.getType()) || "LONG_TEXT".equals(q.getType());
                    if (isTextColumn) {
                        cell.setCellStyle(textCellStyle);
                    }
                    cell.setCellValue(cellValue);
                }
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String formatAnswerShort(ResponseItem item, SurveyQuestion q) {
        if (item.getValueType() == null) return "";
        switch (item.getValueType()) {
            case "OPTION":
                String optLabel = "";
                if (item.getOptionIndex() != null) {
                    optLabel = getOptionLabel(q, item.getOptionIndex());
                } else if (item.getOptionIndices() != null && !item.getOptionIndices().isEmpty()) {
                    try {
                        JsonNode arr = JSON.readTree(item.getOptionIndices());
                        StringBuilder sb = new StringBuilder();
                        for (JsonNode n : arr) {
                            int idx = n.asInt();
                            if (sb.length() > 0) sb.append("、");
                            sb.append(getOptionLabel(q, idx));
                        }
                        optLabel = sb.toString();
                    } catch (Exception ignored) { }
                }
                if (item.getTextValue() != null && !item.getTextValue().isBlank()) {
                    return optLabel + "：" + item.getTextValue();
                }
                return optLabel;
            case "TEXT": return item.getTextValue() != null ? item.getTextValue() : "";
            case "SCALE": return item.getScaleValue() != null ? String.valueOf(item.getScaleValue()) : "";
            default: return "";
        }
    }

    private String getOptionLabel(SurveyQuestion q, int index) {
        if (q.getConfig() == null) return "选项" + index;
        try {
            JsonNode node = JSON.readTree(q.getConfig());
            JsonNode opts = node.get("options");
            int size = (opts != null && opts.isArray()) ? opts.size() : 0;
            if (index >= 0 && index < size) {
                JsonNode label = opts.get(index).get("label");
                return label != null ? label.asText() : "选项" + index;
            }
            if (index == size && node.has("hasOtherOption") && node.get("hasOtherOption").asBoolean()) {
                return "其他";
            }
        } catch (Exception ignored) { }
        return "选项" + index;
    }

    private List<AnalyticsOptionSummary> buildOptionSummary(SurveyQuestion q, List<ResponseItem> items) {
        List<int[]> indices = new ArrayList<>();
        for (ResponseItem ri : items) {
            if (ri.getOptionIndex() != null) indices.add(new int[]{ri.getOptionIndex()});
            else if (ri.getOptionIndices() != null && !ri.getOptionIndices().isEmpty()) {
                try {
                    JsonNode arr = JSON.readTree(ri.getOptionIndices());
                    int[] a = new int[arr.size()];
                    for (int i = 0; i < arr.size(); i++) a[i] = arr.get(i).asInt();
                    indices.add(a);
                } catch (Exception ignored) { }
            }
        }
        int optionCount = 0;
        boolean hasOtherOption = false;
        try {
            if (q.getConfig() != null) {
                JsonNode node = JSON.readTree(q.getConfig());
                JsonNode opts = node.get("options");
                if (opts != null && opts.isArray()) optionCount = opts.size();
                if (node.has("hasOtherOption") && node.get("hasOtherOption").asBoolean()) {
                    hasOtherOption = true;
                    optionCount++;
                }
            }
        } catch (Exception ignored) { }
        int totalResponses = indices.size();
        List<AnalyticsOptionSummary> list = new ArrayList<>();
        for (int i = 0; i < optionCount; i++) {
            final int idx = i;
            long count = indices.stream().filter(x -> Arrays.stream(x).anyMatch(v -> v == idx)).count();
            AnalyticsOptionSummary o = new AnalyticsOptionSummary();
            o.setOptionIndex(idx);
            o.setLabel(getOptionLabel(q, idx));
            o.setCount(count);
            o.setRatio(totalResponses > 0 ? (double) count / totalResponses : 0);
            list.add(o);
        }
        return list;
    }

    private AnalyticsScaleSummary buildScaleSummary(List<ResponseItem> items) {
        List<Integer> values = items.stream().map(ResponseItem::getScaleValue).filter(Objects::nonNull).collect(Collectors.toList());
        double avg = values.isEmpty() ? 0 : values.stream().mapToInt(Integer::intValue).average().orElse(0);
        Map<Integer, Long> dist = values.stream().collect(Collectors.groupingBy(x -> x, Collectors.counting()));
        AnalyticsScaleSummary s = new AnalyticsScaleSummary();
        s.setAvg(avg);
        List<AnalyticsScaleSummary.ScaleDistributionItem> distList = new ArrayList<>();
        for (Map.Entry<Integer, Long> e : dist.entrySet()) {
            AnalyticsScaleSummary.ScaleDistributionItem d = new AnalyticsScaleSummary.ScaleDistributionItem();
            d.setValue(e.getKey());
            d.setCount(e.getValue());
            distList.add(d);
        }
        distList.sort(Comparator.comparingInt(AnalyticsScaleSummary.ScaleDistributionItem::getValue));
        s.setDistribution(distList);
        return s;
    }
}
