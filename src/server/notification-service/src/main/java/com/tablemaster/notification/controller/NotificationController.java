

package com.tablemaster.notification.controller;

import com.tablemaster.notification.dto.NotificationEmailPayload;
import com.tablemaster.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final EmailService emailService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> res = new HashMap<>();
        res.put("service", "notification-service");
        res.put("status", "UP");
        res.put("port", 8086);
        res.put("channels", new String[]{"EMAIL", "ZNS"});
        return ResponseEntity.ok(res);
    }

    /**
     * Endpoint gửi email xác nhận đặt bàn & vé điện tử trực tiếp qua REST
     */
    @PostMapping("/send-email")
    public ResponseEntity<Map<String, Object>> sendEmail(@RequestBody NotificationEmailPayload payload) {
        log.info("API trigger gửi email cho khách: {} ({})", payload.getGuestName(), payload.getGuestEmail());
        boolean success = emailService.sendBookingEmail(payload);

        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", success ? "Đã gửi email vé điện tử thành công" : "Gửi email thất bại");
        res.put("bookingCode", payload.getBookingCode());
        res.put("recipient", payload.getRecipientEmail() != null ? payload.getRecipientEmail() : payload.getGuestEmail());

        return ResponseEntity.ok(res);
    }
}

