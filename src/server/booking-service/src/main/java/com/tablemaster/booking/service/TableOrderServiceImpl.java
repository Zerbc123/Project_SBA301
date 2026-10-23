package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.TableOrderRequest;
import com.tablemaster.booking.dto.response.TableOrderItemResponse;
import com.tablemaster.booking.entity.Booking;
import com.tablemaster.booking.entity.TableOrderItem;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.enums.OrderItemStatus;
import com.tablemaster.booking.exception.BookingNotFoundException;
import com.tablemaster.booking.exception.InvalidBookingStateException;
import com.tablemaster.booking.repository.BookingRepository;
import com.tablemaster.booking.repository.TableOrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TableOrderServiceImpl implements TableOrderService {

    private final BookingRepository bookingRepository;
    private final TableOrderItemRepository tableOrderItemRepository;

    @Override
    @Transactional
    public List<TableOrderItemResponse> addTableOrders(UUID bookingId, TableOrderRequest request, UUID staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() != BookingStatus.SEATED) {
            throw new InvalidBookingStateException("Chỉ có thể gọi thêm món khi khách đang ngồi ăn (Trạng thái SEATED). Hiện tại: " + booking.getStatus());
        }

        List<TableOrderItem> itemsToSave = new ArrayList<>();
        for (TableOrderRequest.OrderItemRequest itemReq : request.getItems()) {
            TableOrderItem orderItem = TableOrderItem.builder()
                    .booking(booking)
                    .tableId(request.getTableId())
                    .menuItemId(itemReq.getMenuItemId())
                    .itemName(itemReq.getItemName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .status(OrderItemStatus.PREPARING)
                    .notes(itemReq.getNotes())
                    .orderedByUserId(staffId)
                    .build();
            itemsToSave.add(orderItem);
        }

        List<TableOrderItem> saved = tableOrderItemRepository.saveAll(itemsToSave);
        log.info("Saved {} in-dining order items for booking: {}, table: {}", saved.size(), bookingId, request.getTableId());

        return saved.stream().map(TableOrderItemResponse::fromEntity).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TableOrderItemResponse> getTableOrders(UUID bookingId) {
        return tableOrderItemRepository.findByBookingIdOrderByCreatedAtAsc(bookingId).stream()
                .map(TableOrderItemResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TableOrderItemResponse updateItemStatus(UUID itemId, OrderItemStatus status) {
        TableOrderItem item = tableOrderItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món gọi tại bàn với ID: " + itemId));

        item.setStatus(status);
        TableOrderItem saved = tableOrderItemRepository.save(item);
        log.info("Updated order item {} status to {}", itemId, status);

        return TableOrderItemResponse.fromEntity(saved);
    }
}
