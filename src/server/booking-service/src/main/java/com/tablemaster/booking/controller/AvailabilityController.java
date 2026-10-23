package com.tablemaster.booking.controller;

import com.tablemaster.booking.dto.request.AvailabilitySearchRequest;
import com.tablemaster.booking.dto.response.ApiResponse;
import com.tablemaster.booking.dto.response.AvailabilitySearchResponse;
import com.tablemaster.booking.dto.response.TableAvailabilityDto;
import com.tablemaster.booking.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * UC-04: REST Controller cho Tra cứu Bàn trống theo Ca giờ & Số người (Availability Search Engine)
 * Áp dụng bộ lọc thông minh: ngày, khung ca (trưa/tối), số lượng người lớn, trẻ em và tầng.
 * Kiểm tra ràng buộc sức chứa Min/Max (BR-01) và trạng thái trống của bàn.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/bookings/availability")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    /**
     * GET /api/v1/bookings/availability
     * Tra cứu bàn trống theo query parameters
     */
    @GetMapping
    public ResponseEntity<ApiResponse<AvailabilitySearchResponse>> searchAvailability(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bookingDate,
            @RequestParam(required = false) UUID timeSlotId,
            @RequestParam(required = false) String shift,
            @RequestParam(required = false, defaultValue = "2") Integer adults,
            @RequestParam(required = false, defaultValue = "0") Integer children,
            @RequestParam(required = false) Integer guestCount,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) UUID floorPlanId,
            @RequestParam(required = false) String zoneType,
            @RequestParam(required = false, defaultValue = "false") Boolean onlyAvailable) {

        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .shift(shift)
                .adults(adults)
                .children(children)
                .guestCount(guestCount)
                .floor(floor)
                .floorPlanId(floorPlanId)
                .zoneType(zoneType)
                .onlyAvailable(onlyAvailable)
                .build();

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);
        return ResponseEntity.ok(ApiResponse.success("Tra cứu bàn trống thành công", response));
    }

    /**
     * POST /api/v1/bookings/availability/search
     * Tra cứu bàn trống qua JSON body
     */
    @PostMapping("/search")
    public ResponseEntity<ApiResponse<AvailabilitySearchResponse>> searchAvailabilityPost(
            @RequestBody AvailabilitySearchRequest request) {
        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);
        return ResponseEntity.ok(ApiResponse.success("Tra cứu bàn trống thành công", response));
    }

    /**
     * GET /api/v1/bookings/availability/check-table
     * Kiểm tra trạng thái và ràng buộc BR-01 cho 1 bàn cụ thể
     */
    @GetMapping("/check-table")
    public ResponseEntity<ApiResponse<TableAvailabilityDto>> checkTableAvailability(
            @RequestParam UUID tableId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bookingDate,
            @RequestParam(required = false) UUID timeSlotId,
            @RequestParam(required = false, defaultValue = "2") int guestCount) {

        TableAvailabilityDto response = availabilityService.checkTableAvailability(
                tableId, bookingDate, timeSlotId, guestCount);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
