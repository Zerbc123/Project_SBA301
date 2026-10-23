package com.tablemaster.booking.controller;

import com.tablemaster.booking.dto.request.TableOrderRequest;
import com.tablemaster.booking.dto.response.ApiResponse;
import com.tablemaster.booking.dto.response.TableOrderItemResponse;
import com.tablemaster.booking.enums.OrderItemStatus;
import com.tablemaster.booking.service.TableOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class TableOrderController {

    private final TableOrderService tableOrderService;

    /**
     * POST /api/v1/bookings/{id}/table-orders
     * Nhân viên phục vụ dùng tablet gọi thêm món tại bàn cho khách
     */
    @PostMapping("/{id}/table-orders")
    public ResponseEntity<ApiResponse<List<TableOrderItemResponse>>> addTableOrders(
            @PathVariable UUID id,
            @Valid @RequestBody TableOrderRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID staffId) {
        List<TableOrderItemResponse> items = tableOrderService.addTableOrders(id, request, staffId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gọi món thành công", items));
    }

    /**
     * GET /api/v1/bookings/{id}/table-orders
     * Lấy danh sách tất cả các món đã gọi tại bàn của đơn đặt bàn
     */
    @GetMapping("/{id}/table-orders")
    public ResponseEntity<ApiResponse<List<TableOrderItemResponse>>> getTableOrders(
            @PathVariable UUID id) {
        List<TableOrderItemResponse> items = tableOrderService.getTableOrders(id);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    /**
     * PATCH /api/v1/bookings/table-orders/{itemId}/status
     * Bếp/Phục vụ cập nhật trạng thái món (PREPARING, SERVED, CANCELLED)
     */
    @PatchMapping("/table-orders/{itemId}/status")
    public ResponseEntity<ApiResponse<TableOrderItemResponse>> updateItemStatus(
            @PathVariable UUID itemId,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu trường status"));
        }
        OrderItemStatus status = OrderItemStatus.valueOf(statusStr.toUpperCase());
        TableOrderItemResponse response = tableOrderService.updateItemStatus(itemId, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái món thành công", response));
    }
}
