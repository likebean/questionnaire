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
}
