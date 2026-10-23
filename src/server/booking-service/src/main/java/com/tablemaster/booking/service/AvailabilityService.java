package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.AvailabilitySearchRequest;
import com.tablemaster.booking.dto.response.AvailabilitySearchResponse;
import com.tablemaster.booking.dto.response.TableAvailabilityDto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * UC-04: Availability Search Engine Interface
 * Cung cấp thuật toán quét bàn trống theo ngày, ca giờ, số khách (BR-01 Min/Max) và tầng
 */
public interface AvailabilityService {

    /**
     * Tra cứu bàn trống thông minh theo bộ lọc
     */
    AvailabilitySearchResponse searchAvailability(AvailabilitySearchRequest request);

    /**
     * Kiểm tra nhanh 1 bàn cụ thể xem có thỏa mãn sức chứa (BR-01) và đang trống không
     */
    TableAvailabilityDto checkTableAvailability(UUID tableId, LocalDate bookingDate, UUID timeSlotId, int guestCount);
}
