package com.tablemaster.booking.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.UUID;

@ResponseStatus(HttpStatus.CONFLICT)
public class TableAlreadyBookedException extends RuntimeException {
    public TableAlreadyBookedException(UUID tableId) {
        super("Bàn " + tableId + " đã có người đặt hoặc đang có khách trong khung giờ này.");
    }

    public TableAlreadyBookedException(String message) {
        super(message);
    }
}
