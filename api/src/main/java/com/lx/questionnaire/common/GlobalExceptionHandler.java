package com.lx.questionnaire.common;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Result<Void>> buildResponse(HttpStatus status, ErrorCode code) {
        return ResponseEntity.status(status).body(Result.fail(code.getCode(), code.getMessage()));
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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(HttpServletRequest request, Exception e) {
        log.error("系统异常 - {} {}", request.getMethod(), request.getRequestURI(), e);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SYSTEM_ERROR);
    }
}
