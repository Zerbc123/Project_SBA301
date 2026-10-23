package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.TableOrderRequest;
import com.tablemaster.booking.dto.response.TableOrderItemResponse;
import com.tablemaster.booking.enums.OrderItemStatus;

import java.util.List;
import java.util.UUID;

public interface TableOrderService {

    List<TableOrderItemResponse> addTableOrders(UUID bookingId, TableOrderRequest request, UUID staffId);

    List<TableOrderItemResponse> getTableOrders(UUID bookingId);

    TableOrderItemResponse updateItemStatus(UUID itemId, OrderItemStatus status);
}
