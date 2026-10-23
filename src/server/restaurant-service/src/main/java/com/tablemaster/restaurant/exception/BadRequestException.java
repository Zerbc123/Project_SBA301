package com.tablemaster.restaurant.exception;

import lombok.Getter;

@Getter
public class BadRequestException extends AppException {
    public BadRequestException(ErrorCode errorCode) {
        super(errorCode);
    }

    public BadRequestException(String message) {
        super(ErrorCode.BAD_REQUEST, message);
    }
}
