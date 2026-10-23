package com.tablemaster.analytics.dto.response;

import lombok.*;
import java.time.ZonedDateTime;

/**
 * Chuẩn hóa cấu trúc phản hồi dữ liệu API cho toàn bộ Analytics Microservice
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiResponse<T> {
    private boolean success;
    private int code;
    private String message;
    private T data;
    @Builder.Default
    private ZonedDateTime timestamp = ZonedDateTime.now();

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .code(200)
                .message("Thao tác thành công")
                .data(data)
                .timestamp(ZonedDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .code(200)
                .message(message)
                .data(data)
                .timestamp(ZonedDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .code(code)
                .message(message)
                .data(null)
                .timestamp(ZonedDateTime.now())
                .build();
    }
}
