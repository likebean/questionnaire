package com.lx.questionnaire.service;

import com.lx.questionnaire.dto.SurveyListFilter;
import com.lx.questionnaire.entity.Survey;

/**
 * 问卷/答卷的按角色权限校验（resource_type + action + data_scope）。
 */
public interface SurveyPermissionService {

    /**
     * 校验当前用户对资源是否有指定操作权限，无权限时抛 BusinessException(FORBIDDEN)。
     * @param userId 当前用户 ID
     * @param resourceType "survey" | "response"
     * @param survey 问卷（action 为 create 时可传 null）
     * @param action view | edit | publish | delete | create(survey) | export(response)
     */
    void requirePermission(String userId, String resourceType, Survey survey, String action);

    /**
     * 列表「非仅我创建的」时，按权限范围返回过滤条件（基于 survey.creator_id / survey.department_id）。
     * department_id 为 null 的问卷约定为无部门/仅本人可见。
     */
    SurveyListFilter getSurveyViewListFilter(String userId);
}
