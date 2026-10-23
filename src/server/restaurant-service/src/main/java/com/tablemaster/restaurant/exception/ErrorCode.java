package com.tablemaster.restaurant.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // 404 NOT FOUND
    RESOURCE_NOT_FOUND("Không tìm thấy dữ liệu yêu cầu", HttpStatus.NOT_FOUND),
    RESTAURANT_PROFILE_NOT_FOUND("Không tìm thấy thông tin cấu hình nhà hàng", HttpStatus.NOT_FOUND),
    RESTAURANT_NOT_FOUND("Không tìm thấy thông tin nhà hàng", HttpStatus.NOT_FOUND),
    FLOOR_PLAN_NOT_FOUND("Không tìm thấy sơ đồ tầng", HttpStatus.NOT_FOUND),
    TABLE_NOT_FOUND("Không tìm thấy bàn", HttpStatus.NOT_FOUND),
    TIME_SLOT_NOT_FOUND("Không tìm thấy khung giờ", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND("Không tìm thấy danh mục món", HttpStatus.NOT_FOUND),
    MENU_ITEM_NOT_FOUND("Không tìm thấy món ăn", HttpStatus.NOT_FOUND),
    BLACKOUT_DATE_NOT_FOUND("Không tìm thấy ngày lễ hoặc ngày đặc biệt", HttpStatus.NOT_FOUND),

    // 400 BAD REQUEST
    BAD_REQUEST("Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    TIME_SLOT_INVALID_HOURS("Giờ bắt đầu phải trước giờ kết thúc", HttpStatus.BAD_REQUEST),
    TABLE_CAPACITY_INVALID("Sức chứa tối thiểu không thể lớn hơn sức chứa tối đa", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_ITEMS("Không thể xóa danh mục đang có món ăn. Vui lòng chuyển hoặc xóa các món ăn trước", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED("Dữ liệu gửi lên không hợp lệ", HttpStatus.BAD_REQUEST),

    // 409 CONFLICT
    CONFLICT("Dữ liệu xung đột hoặc đã tồn tại", HttpStatus.CONFLICT),
    TIME_SLOT_ALREADY_EXISTS("Khung giờ đã tồn tại trong hệ thống", HttpStatus.CONFLICT),
    TABLE_CODE_ALREADY_EXISTS("Mã bàn đã tồn tại trong hệ thống", HttpStatus.CONFLICT),
    FLOOR_PLAN_ALREADY_EXISTS("Đã tồn tại sơ đồ cho tầng này", HttpStatus.CONFLICT),
    BLACKOUT_DATE_ALREADY_EXISTS("Đã tồn tại cấu hình sự kiện cho ngày này", HttpStatus.CONFLICT),

    // 500 INTERNAL SERVER ERROR
    INTERNAL_SERVER_ERROR("Lỗi hệ thống máy chủ", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String message, HttpStatus httpStatus) {
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
