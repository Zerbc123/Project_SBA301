package com.tablemaster.restaurant.exception;

import lombok.Getter;

@Getter
public class ResourceNotFoundException extends AppException {
    public ResourceNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message);
    }
}
