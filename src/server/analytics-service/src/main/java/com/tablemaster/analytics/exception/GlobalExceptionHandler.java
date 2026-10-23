package com.tablemaster.analytics.exception;

import com.tablemaster.analytics.dto.response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Bộ xử lý ngoại lệ tập trung (Global Exception Handler)
 * Tăng cường bảo mật:
 * 1. Chuẩn hóa lỗi Validation đầu vào (CWE-20)
 * 2. Ngăn chặn rò rỉ thông tin hệ thống / Stack Trace (CWE-209: Information Exposure)
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));

        log.warn("[Security] Validation failed: {}", errorMessage);
        return ApiResponse.error(400, "Dữ liệu yêu cầu không hợp lệ: " + errorMessage);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("[Security] Constraint violation: {}", ex.getMessage());
        return ApiResponse.error(400, "Tham số không hợp lệ: " + ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("[Security] Illegal argument: {}", ex.getMessage());
        return ApiResponse.error(400, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleGeneralException(Exception ex) {
        // Ghi log chi tiết trên server nội bộ nhưng không leak stack trace cho client
        log.error("[System Error] Unhandled exception occurred: ", ex);
        return ApiResponse.error(500, "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.");
    }
}
