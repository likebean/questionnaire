package com.lx.questionnaire.common;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final Environment environment;

    private ResponseEntity<Result<Void>> buildResponse(HttpStatus status, ErrorCode code) {
        return ResponseEntity.status(status).body(Result.fail(code.getCode(), code.getMessage()));
    }

    private ResponseEntity<Result<Void>> buildResponse(HttpStatus status, int code, String message) {
        return ResponseEntity.status(status).body(Result.fail(code, message));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(HttpServletRequest request, BusinessException e) {
        log.warn("业务异常: {} - {} {}", e.getMessage(), request.getMethod(), request.getRequestURI());
        int code = e.getErrorCode().getCode();
        HttpStatus status = code == 401 ? HttpStatus.UNAUTHORIZED
                : code == 403 ? HttpStatus.FORBIDDEN
                : code == 404 ? HttpStatus.NOT_FOUND
                : HttpStatus.BAD_REQUEST;
        return buildResponse(status, e.getErrorCode());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(HttpServletRequest request, MethodArgumentNotValidException e) {
        log.warn("参数校验失败: {} - {} {}", e.getMessage(), request.getMethod(), request.getRequestURI());
        return buildResponse(HttpStatus.BAD_REQUEST, ErrorCode.PARAM_ERROR);
    }

    /** 请求路径非后端 API（如 /auth/login 为前端路由），返回 404 避免打满错误日志 */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<Void>> handleNoResourceFound(HttpServletRequest request, NoResourceFoundException e) {
        log.debug("未找到资源（可能为前端路由）: {} {}", request.getMethod(), request.getRequestURI());
        return buildResponse(HttpStatus.NOT_FOUND, 404, "Not Found");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(HttpServletRequest request, Exception e) {
        log.error("系统异常 - {} {}", request.getMethod(), request.getRequestURI(), e);
        boolean isDev = Arrays.stream(environment.getActiveProfiles()).noneMatch("prod"::equals);
        String message = ErrorCode.SYSTEM_ERROR.getMessage();
        if (isDev && e.getMessage() != null) {
            message = message + ": " + e.getMessage();
        }
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SYSTEM_ERROR.getCode(), message);
    }
}
