package com.lx.questionnaire.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 问卷列表按权限范围的过滤条件（基于 survey.creator_id / survey.department_id，不拉取大批 creator 列表）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SurveyListFilter {
    /** true 表示全校范围，不限制 */
    private boolean allowAll;
    /** 仅本人：按创建人过滤 */
    private String creatorId;
    /** 本院系：按问卷归属院系过滤（department_id 为 null 的问卷仅本人可见） */
    private Long departmentId;

    public static SurveyListFilter noAccess() {
        return new SurveyListFilter(false, null, null);
    }

    public static SurveyListFilter allowAll() {
        return new SurveyListFilter(true, null, null);
    }
}
