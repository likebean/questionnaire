package com.lx.questionnaire.common;

import lombok.Getter;

@Getter
public abstract class ErrorCode {
    protected final int code;
    protected final String message;

    protected ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public static final ErrorCode SYSTEM_ERROR = new ErrorCode(1000, "系统错误") {};
    public static final ErrorCode PARAM_ERROR = new ErrorCode(1001, "参数错误") {};
    public static final ErrorCode UNAUTHORIZED = new ErrorCode(401, "未登录或登录已过期") {};
    public static final ErrorCode FORBIDDEN = new ErrorCode(403, "无权限") {};
    public static final ErrorCode ACCOUNT_NOT_FOUND = new ErrorCode(2001, "账号不存在") {};
    public static final ErrorCode USER_NOT_FOUND = new ErrorCode(2002, "用户不存在") {};
    public static final ErrorCode CAS_VALIDATE_FAILED = new ErrorCode(2003, "CAS 认证失败") {};
    public static final ErrorCode NOT_FOUND = new ErrorCode(404, "资源不存在") {};
    public static final ErrorCode SURVEY_NOT_FOUND = new ErrorCode(4001, "问卷已删除") {};
    public static final ErrorCode SURVEY_NOT_STARTED = new ErrorCode(4002, "未到开始时间") {};
    public static final ErrorCode SURVEY_ENDED = new ErrorCode(4003, "问卷已截止") {};
    public static final ErrorCode SURVEY_ALREADY_SUBMITTED = new ErrorCode(4004, "您已填写过本问卷") {};

    public static ErrorCode fail(int code, String message) {
        return new ErrorCode(code, message) {};
    }
}
