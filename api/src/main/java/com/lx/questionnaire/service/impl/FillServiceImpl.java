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
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FillServiceImpl implements FillService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_SUBMITTED = "SUBMITTED";
    private static final String STATUS_COLLECTING = "COLLECTING";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final String VALUE_TYPE_OPTION = "OPTION";
    private static final String VALUE_TYPE_TEXT = "TEXT";
    private static final String VALUE_TYPE_SCALE = "SCALE";
    private static final int SUBMIT_VALIDATION_CODE = 4005;
    private static final String TYPE_SINGLE = "SINGLE_CHOICE";
    private static final String TYPE_MULTIPLE = "MULTIPLE_CHOICE";
    private static final String TYPE_SHORT_TEXT = "SHORT_TEXT";
    private static final String TYPE_LONG_TEXT = "LONG_TEXT";
    private static final String TYPE_SCALE = "SCALE";

    private final SurveyMapper surveyMapper;
    private final SurveyQuestionMapper surveyQuestionMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final ObjectMapper objectMapper;

    @Override
    public FillSurveyVO getFillMetadata(String surveyId, String userId) {
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
                    .eq(Response::getSurveyId, surveyId).eq(Response::getUserId, userId).eq(Response::getStatus, STATUS_SUBMITTED));
            if (count > 0) {
                throw new BusinessException(ErrorCode.SURVEY_ALREADY_SUBMITTED);
            }
        }
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        return FillSurveyVO.from(s, questions);
    }

    @Override
    public FillSurveyVO getFillMetadataForPreview(String surveyId, String userId) {
        Survey s = surveyMapper.selectById(surveyId);
        if (s == null) {
            throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        }
        if (userId == null || userId.isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        if (!userId.equals(s.getCreatorId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        return FillSurveyVO.from(s, questions);
    }

    @Override
    @Transactional
    public void submit(String surveyId, String userId, SubmitRequestDTO request, String clientIp) {
        getFillMetadata(surveyId, userId);

        Survey s = surveyMapper.selectById(surveyId);
        if (s != null) {
            Integer limitByIp = s.getLimitByIp();
            if (limitByIp != null && limitByIp > 0 && clientIp != null && !clientIp.isBlank()) {
                long ipCount = responseMapper.selectCount(new LambdaQueryWrapper<Response>()
                        .eq(Response::getSurveyId, surveyId).eq(Response::getSubmittedIp, clientIp).eq(Response::getStatus, STATUS_SUBMITTED));
                if (ipCount >= limitByIp) {
                    throw new BusinessException(ErrorCode.SURVEY_IP_LIMIT);
                }
            }
            Integer limitByDevice = s.getLimitByDevice();
            String deviceId = request != null ? request.getDeviceId() : null;
            if (limitByDevice != null && limitByDevice > 0 && deviceId != null && !deviceId.isBlank()) {
                long deviceCount = responseMapper.selectCount(new LambdaQueryWrapper<Response>()
                        .eq(Response::getSurveyId, surveyId).eq(Response::getDeviceId, deviceId).eq(Response::getStatus, STATUS_SUBMITTED));
                if (deviceCount >= limitByDevice) {
                    throw new BusinessException(ErrorCode.SURVEY_DEVICE_LIMIT);
                }
            }
        }

        List<SurveyQuestion> questions = surveyQuestionMapper.selectList(
                new LambdaQueryWrapper<SurveyQuestion>().eq(SurveyQuestion::getSurveyId, surveyId).orderByAsc(SurveyQuestion::getSortOrder));
        Map<Long, SurveyQuestion> questionMap = questions.stream().collect(Collectors.toMap(SurveyQuestion::getId, q -> q));

        validateSubmitItems(surveyId, request.getItems(), questionMap);

        Survey sForDraft = surveyMapper.selectById(surveyId);
        String deviceId = request != null ? request.getDeviceId() : null;
        LambdaQueryWrapper<Response> draftQuery = new LambdaQueryWrapper<Response>()
                .eq(Response::getSurveyId, surveyId).eq(Response::getStatus, STATUS_DRAFT);
        if (Boolean.TRUE.equals(sForDraft != null && sForDraft.getAllowAnonymous())) {
            draftQuery.eq(Response::getDeviceId, deviceId);
        } else {
            draftQuery.eq(Response::getUserId, userId);
        }
        Response r = responseMapper.selectOne(draftQuery);
        if (r != null) {
            r.setStatus(STATUS_SUBMITTED);
            r.setUserId(userId);
            r.setSubmittedAt(LocalDateTime.now());
            r.setDurationSeconds(request.getDurationSeconds());
            r.setSubmittedIp(clientIp);
            responseMapper.updateById(r);
            responseItemMapper.delete(new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, r.getId()));
        } else {
            r = new Response();
            r.setSurveyId(surveyId);
            r.setUserId(userId);
            r.setStatus(STATUS_SUBMITTED);
            r.setSubmittedAt(LocalDateTime.now());
            r.setDurationSeconds(request.getDurationSeconds());
            r.setSubmittedIp(clientIp);
            r.setDeviceId(deviceId);
            responseMapper.insert(r);
        }

        if (request.getItems() != null) {
            for (SubmitItemDTO item : request.getItems()) {
                if (item.getQuestionId() == null) continue;
                ResponseItem ri = buildResponseItem(item, r.getId());
                if (ri != null) {
                    responseItemMapper.insert(ri);
                }
            }
        }
    }

    @Override
    @Transactional
    public void saveDraft(String surveyId, String userId, String deviceId, List<SubmitItemDTO> items) {
        Survey s = surveyMapper.selectById(surveyId);
        if (s == null) throw new BusinessException(ErrorCode.SURVEY_NOT_FOUND);
        if (STATUS_DRAFT.equals(s.getStatus())) return;
        if (STATUS_ENDED.equals(s.getStatus()) || STATUS_PAUSED.equals(s.getStatus())) return;

        boolean byUser = !Boolean.TRUE.equals(s.getAllowAnonymous());
        if (byUser && (userId == null || userId.isBlank())) return;
        if (!byUser && (deviceId == null || deviceId.isBlank())) return;

        LambdaQueryWrapper<Response> q = new LambdaQueryWrapper<Response>()
                .eq(Response::getSurveyId, surveyId).eq(Response::getStatus, STATUS_DRAFT);
        if (byUser) q.eq(Response::getUserId, userId); else q.eq(Response::getDeviceId, deviceId);
        Response r = responseMapper.selectOne(q);
        if (r == null) {
            r = new Response();
            r.setSurveyId(surveyId);
            r.setUserId(userId);
            r.setStatus(STATUS_DRAFT);
            r.setSubmittedAt(null);
            r.setDeviceId(deviceId);
            responseMapper.insert(r);
        } else {
            r.setUserId(userId);
            r.setDeviceId(deviceId);
            responseMapper.updateById(r);
        }
        responseItemMapper.delete(new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, r.getId()));
        if (items != null) {
            for (SubmitItemDTO item : items) {
                if (item.getQuestionId() == null) continue;
                ResponseItem ri = buildResponseItem(item, r.getId());
                if (ri != null) responseItemMapper.insert(ri);
            }
        }
    }

    @Override
    public List<SubmitItemDTO> getDraft(String surveyId, String userId, String deviceId) {
        if (surveyId == null) return null;
        Survey s = surveyMapper.selectById(surveyId);
        if (s == null) return null;
        boolean byUser = !Boolean.TRUE.equals(s.getAllowAnonymous());
        if (byUser && (userId == null || userId.isBlank())) return null;
        if (!byUser && (deviceId == null || deviceId.isBlank())) return null;
        LambdaQueryWrapper<Response> q = new LambdaQueryWrapper<Response>()
                .eq(Response::getSurveyId, surveyId).eq(Response::getStatus, STATUS_DRAFT);
        if (byUser) q.eq(Response::getUserId, userId); else q.eq(Response::getDeviceId, deviceId);
        Response r = responseMapper.selectOne(q);
        if (r == null) return null;
        List<ResponseItem> list = responseItemMapper.selectList(new LambdaQueryWrapper<ResponseItem>().eq(ResponseItem::getResponseId, r.getId()));
        return list.stream().map(this::responseItemToSubmitItem).filter(Objects::nonNull).collect(Collectors.toList());
    }

    private SubmitItemDTO responseItemToSubmitItem(ResponseItem ri) {
        if (ri == null || ri.getQuestionId() == null) return null;
        SubmitItemDTO dto = new SubmitItemDTO();
        dto.setQuestionId(ri.getQuestionId());
        dto.setOptionIndex(ri.getOptionIndex());
        if (ri.getOptionIndices() != null && !ri.getOptionIndices().isBlank()) {
            try {
                List<?> arr = objectMapper.readValue(ri.getOptionIndices(), List.class);
                dto.setOptionIndices(arr.stream().filter(x -> x instanceof Number).map(x -> ((Number) x).intValue()).mapToInt(i -> i).toArray());
            } catch (JsonProcessingException e) {
                // ignore
            }
        }
        dto.setTextValue(ri.getTextValue());
        dto.setScaleValue(ri.getScaleValue());
        return dto;
    }

    private void validateSubmitItems(String surveyId, List<SubmitItemDTO> items, Map<Long, SurveyQuestion> questionMap) {
        if (items == null) items = List.of();

        Set<Long> answeredIds = new HashSet<>();
        for (SubmitItemDTO item : items) {
            if (item.getQuestionId() == null) continue;
            SurveyQuestion q = questionMap.get(item.getQuestionId());
            if (q == null) {
                throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "题目不属于本问卷"));
            }
            if (answeredIds.contains(item.getQuestionId())) {
                throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "同一题目不能重复作答"));
            }
            answeredIds.add(item.getQuestionId());
            validateItemValue(item, q);
        }

        for (SurveyQuestion q : questionMap.values()) {
            if (Boolean.TRUE.equals(q.getRequired()) && !answeredIds.contains(q.getId())) {
                throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "请完成必填题：" + (q.getTitle() != null ? q.getTitle() : "题目" + q.getId())));
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void validateItemValue(SubmitItemDTO item, SurveyQuestion q) {
        String type = q.getType();
        Map<String, Object> config = parseConfig(q.getConfig());

        switch (type == null ? "" : type) {
            case TYPE_SINGLE -> {
                if (item.getOptionIndex() == null) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "请选择选项：" + q.getTitle()));
                }
                int optionCount = getOptionsCount(config);
                if (item.getOptionIndex() < 0 || item.getOptionIndex() >= optionCount) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "选项无效：" + q.getTitle()));
                }
            }
            case TYPE_MULTIPLE -> {
                if (item.getOptionIndices() == null || item.getOptionIndices().length == 0) {
                    if (Boolean.TRUE.equals(q.getRequired())) {
                        throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "请至少选择一项：" + q.getTitle()));
                    }
                    break;
                }
                int optCount = getOptionsCount(config);
                for (int idx : item.getOptionIndices()) {
                    if (idx < 0 || idx >= optCount) {
                        throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "选项无效：" + q.getTitle()));
                    }
                }
                int minC = getInt(config, "minChoices", 0);
                int maxC = getInt(config, "maxChoices", Integer.MAX_VALUE);
                int chosen = item.getOptionIndices().length;
                if (chosen < minC) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "至少选 " + minC + " 项：" + q.getTitle()));
                }
                if (chosen > maxC) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "最多选 " + maxC + " 项：" + q.getTitle()));
                }
            }
            case TYPE_SHORT_TEXT, TYPE_LONG_TEXT -> {
                if (item.getTextValue() == null && Boolean.TRUE.equals(q.getRequired())) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "请填写：" + q.getTitle()));
                }
                if (item.getTextValue() != null && !item.getTextValue().isBlank()) {
                    validateTextByConfig(item.getTextValue(), config, q.getTitle());
                }
            }
            case TYPE_SCALE -> {
                if (item.getScaleValue() == null) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "请选择分值：" + q.getTitle()));
                }
                int minS = getInt(config, "scaleMin", 1);
                int maxS = getInt(config, "scaleMax", 5);
                if (item.getScaleValue() < minS || item.getScaleValue() > maxS) {
                    throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "分值需在 " + minS + "～" + maxS + " 之间：" + q.getTitle()));
                }
            }
            default -> throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "不支持的题型：" + type));
        }
    }

    private ResponseItem buildResponseItem(SubmitItemDTO item, Long responseId) {
        ResponseItem ri = new ResponseItem();
        ri.setResponseId(responseId);
        ri.setQuestionId(item.getQuestionId());
        if (item.getOptionIndex() != null) {
            ri.setValueType(VALUE_TYPE_OPTION);
            ri.setOptionIndex(item.getOptionIndex());
            if (item.getTextValue() != null && !item.getTextValue().isBlank()) {
                ri.setTextValue(item.getTextValue());
            }
        } else if (item.getOptionIndices() != null && item.getOptionIndices().length > 0) {
            ri.setValueType(VALUE_TYPE_OPTION);
            ri.setOptionIndices(toJsonArray(item.getOptionIndices()));
            if (item.getTextValue() != null && !item.getTextValue().isBlank()) {
                ri.setTextValue(item.getTextValue());
            }
        } else if (item.getTextValue() != null) {
            ri.setValueType(VALUE_TYPE_TEXT);
            ri.setTextValue(item.getTextValue());
        } else if (item.getScaleValue() != null) {
            ri.setValueType(VALUE_TYPE_SCALE);
            ri.setScaleValue(item.getScaleValue());
        } else {
            return null;
        }
        return ri;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseConfig(String configJson) {
        if (configJson == null || configJson.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(configJson, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private int getOptionsCount(Map<String, Object> config) {
        Object opts = config.get("options");
        if (opts instanceof List) return ((List<?>) opts).size();
        return 0;
    }

    private int getInt(Map<String, Object> config, String key, int defaultValue) {
        Object v = config != null ? config.get(key) : null;
        if (v instanceof Number) return ((Number) v).intValue();
        return defaultValue;
    }

    private static String getString(Map<String, Object> config, String key) {
        Object v = config != null ? config.get(key) : null;
        return v != null ? v.toString().trim() : null;
    }

    private void validateTextByConfig(String value, Map<String, Object> config, String questionTitle) {
        String validationType = getString(config, "validationType");
        if (validationType == null || "none".equalsIgnoreCase(validationType)) {
            // only maxLength check
            Integer maxLen = config != null && config.get("maxLength") instanceof Number
                ? ((Number) config.get("maxLength")).intValue() : null;
            if (maxLen != null && maxLen > 0 && value.length() > maxLen) {
                throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "长度不能超过 " + maxLen + " 个字符：" + questionTitle));
            }
            return;
        }
        Integer maxLen = config != null && config.get("maxLength") instanceof Number
            ? ((Number) config.get("maxLength")).intValue() : null;
        if (maxLen != null && maxLen > 0 && value.length() > maxLen) {
            throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, "长度不能超过 " + maxLen + " 个字符：" + questionTitle));
        }
        String msg = null;
        switch (validationType.toLowerCase()) {
            case "number" -> {
                if (!value.matches("-?\\d+(\\.\\d+)?")) {
                    msg = "请填写有效数字";
                }
            }
            case "integer" -> {
                if (!value.matches("-?\\d+")) {
                    msg = "请填写整数";
                }
            }
            case "email" -> {
                if (!value.matches("^[\\w.-]+@[\\w.-]+\\.\\w{2,}$")) {
                    msg = "请填写有效的邮箱地址";
                }
            }
            case "phone" -> {
                if (!value.matches("^1[3-9]\\d{9}$")) {
                    msg = "请填写有效的手机号（11位）";
                }
            }
            case "idcard" -> {
                if (!value.matches("^\\d{15}$|^\\d{17}[0-9Xx]$")) {
                    msg = "请填写有效的身份证号（15或18位）";
                }
            }
            case "url" -> {
                if (!value.matches("^(https?|ftp)://[^\\s/$.?#].[^\\s]*$")) {
                    msg = "请填写有效的网址";
                }
            }
            case "regex" -> {
                String regex = getString(config, "regexPattern");
                if (regex != null && !regex.isEmpty()) {
                    try {
                        if (!Pattern.compile(regex).matcher(value).matches()) {
                            msg = "格式不符合要求";
                        }
                    } catch (Exception e) {
                        // invalid regex, skip
                    }
                }
            }
            default -> { }
        }
        if (msg != null) {
            throw new BusinessException(ErrorCode.fail(SUBMIT_VALIDATION_CODE, msg + "：" + questionTitle));
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
