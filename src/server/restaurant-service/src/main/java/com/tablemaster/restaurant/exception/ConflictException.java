package com.tablemaster.restaurant.exception;

import lombok.Getter;

@Getter
public class ConflictException extends AppException {
    public ConflictException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, message);
    }
}
