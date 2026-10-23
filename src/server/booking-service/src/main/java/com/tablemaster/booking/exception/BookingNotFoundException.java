package com.tablemaster.booking.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.UUID;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class BookingNotFoundException extends RuntimeException {
    public BookingNotFoundException(UUID id) {
        super("Không tìm thấy đơn đặt bàn với ID: " + id);
    }

    public BookingNotFoundException(String message) {
        super(message);
    }
}
