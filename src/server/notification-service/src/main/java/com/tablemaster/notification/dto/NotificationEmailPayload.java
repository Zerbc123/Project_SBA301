package com.tablemaster.notification.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NotificationEmailPayload {
    private String bookingId;
    private String bookingCode;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String recipientEmail;
    private Object bookingDate;
    private Object paymentDeadline;
    private String timeSlotId;
    private Integer guestCount;
    private BigDecimal totalDeposit;
    private String status;
    private String checkinQrToken;
    private String specialNotes;
    private String occasion;
    private List<String> tableIds;
    private List<Map<String, Object>> preorderItems;

    public String getBookingDate() {
        if (bookingDate == null) return "Hôm nay";
        if (bookingDate instanceof List<?> list && list.size() >= 3) {
            return String.format("%04d-%02d-%02d",
                    ((Number) list.get(0)).intValue(),
                    ((Number) list.get(1)).intValue(),
                    ((Number) list.get(2)).intValue());
        }
        return bookingDate.toString();
    }
}
