package com.lx.questionnaire.service.impl;

import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.dto.SurveyListFilter;
import com.lx.questionnaire.entity.Permission;
import com.lx.questionnaire.entity.Survey;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.mapper.PermissionMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.service.SurveyPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyPermissionServiceImpl implements SurveyPermissionService {

    private static final String RESOURCE_SURVEY = "survey";
    private static final String RESOURCE_RESPONSE = "response";
    private static final String SCOPE_SCHOOL = "SCHOOL";
    private static final String SCOPE_DEPARTMENT = "DEPARTMENT";
    private static final String SCOPE_SELF = "SELF";

    private final PermissionMapper permissionMapper;
    private final UserMapper userMapper;

    @Override
    public void requirePermission(String userId, String resourceType, Survey survey, String action) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (survey == null) {
            if (RESOURCE_SURVEY.equals(resourceType) && "create".equals(action)) {
                boolean hasCreate = permissionMapper.selectByUserId(userId).stream()
                        .anyMatch(p -> RESOURCE_SURVEY.equals(p.getResourceType()) && "create".equals(p.getAction()));
                if (!hasCreate) throw new BusinessException(ErrorCode.FORBIDDEN);
                return;
            }
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        List<Permission> perms = permissionMapper.selectByUserId(userId);
        Set<String> scopes = perms.stream()
                .filter(p -> resourceType.equals(p.getResourceType()) && action.equals(p.getAction()))
                .map(Permission::getDataScope)
                .collect(Collectors.toSet());
        if (scopes.isEmpty()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (scopes.contains(SCOPE_SCHOOL)) {
            return;
        }
        if (scopes.contains(SCOPE_DEPARTMENT)) {
            Long surveyDeptId = survey.getDepartmentId();
            if (surveyDeptId != null) {
                User me = userMapper.selectById(userId);
                if (me != null && Objects.equals(me.getDepartmentId(), surveyDeptId)) {
                    return;
                }
            }
        }
        if (scopes.contains(SCOPE_SELF) && userId.equals(survey.getCreatorId())) {
            return;
        }
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    @Override
    public SurveyListFilter getSurveyViewListFilter(String userId) {
        if (userId == null) {
            return SurveyListFilter.noAccess();
        }
        List<Permission> perms = permissionMapper.selectByUserId(userId);
        Set<String> scopes = perms.stream()
                .filter(p -> RESOURCE_SURVEY.equals(p.getResourceType()) && "view".equals(p.getAction()))
                .map(Permission::getDataScope)
                .collect(Collectors.toSet());
        if (scopes.isEmpty()) {
            return SurveyListFilter.noAccess();
        }
        if (scopes.contains(SCOPE_SCHOOL)) {
            return SurveyListFilter.allowAll();
        }
        String creatorId = scopes.contains(SCOPE_SELF) ? userId : null;
        Long departmentId = null;
        if (scopes.contains(SCOPE_DEPARTMENT)) {
            User me = userMapper.selectById(userId);
            if (me != null && me.getDepartmentId() != null) {
                departmentId = me.getDepartmentId();
            }
        }
        if (creatorId == null && departmentId == null) {
            return SurveyListFilter.noAccess();
        }
        return new SurveyListFilter(false, creatorId, departmentId);
    }
}
