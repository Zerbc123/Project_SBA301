package com.tablemaster.booking.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.tablemaster.booking.entity.Booking;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * DTO Response chi tiết đơn đặt bàn
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingResponse {

    private UUID id;
    private String bookingCode;
    private UUID userId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private LocalDate bookingDate;
    private UUID timeSlotId;
    private Integer guestCount;
    private BigDecimal totalDeposit;
    private String status;
    private String specialNotes;
    private String staffNotes;
    private UUID reviewedByUserId;
    private ZonedDateTime paymentDeadline;
    private String checkinQrToken;
    private ZonedDateTime seatedAt;
    private ZonedDateTime completedAt;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    // Danh sách ID bàn đã đặt
    private List<UUID> tableIds;

    // Danh sách món đặt trước
    private List<PreorderItemResponse> preorderItems;

    /**
     * Chuyển từ Entity sang Response DTO
     */
    public static BookingResponse fromEntity(Booking booking) {
        BookingResponseBuilder builder = BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .userId(booking.getUserId())
                .guestName(booking.getGuestName())
                .guestPhone(booking.getGuestPhone())
                .guestEmail(booking.getGuestEmail())
                .bookingDate(booking.getBookingDate())
                .timeSlotId(booking.getTimeSlotId())
                .guestCount(booking.getGuestCount())
                .totalDeposit(booking.getTotalDeposit())
                .status(booking.getStatus().name())
                .specialNotes(booking.getSpecialNotes())
                .staffNotes(booking.getStaffNotes())
                .reviewedByUserId(booking.getReviewedByUserId())
                .paymentDeadline(booking.getPaymentDeadline())
                .checkinQrToken(booking.getCheckinQrToken())
                .seatedAt(booking.getSeatedAt())
                .completedAt(booking.getCompletedAt())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt());

        // Map bàn đã đặt
        if (booking.getBookingTables() != null) {
            builder.tableIds(booking.getBookingTables().stream()
                    .map(bt -> bt.getId().getTableId())
                    .collect(Collectors.toList()));
        }

        // Map món đặt trước
        if (booking.getPreorderItems() != null) {
            builder.preorderItems(booking.getPreorderItems().stream()
                    .map(item -> PreorderItemResponse.builder()
                            .id(item.getId())
                            .menuItemId(item.getMenuItemId())
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .subtotal(item.getSubtotal())
                            .build())
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PreorderItemResponse {
        private UUID id;
        private UUID menuItemId;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
