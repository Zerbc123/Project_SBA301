package com.tablemaster.analytics.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

/**
 * Request DTO phục vụ phân trang và giới hạn bảng xếp hạng
 * Ngăn chặn DoS do yêu cầu số lượng bản ghi quá lớn
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopRankRequest {

    @Min(value = 1, message = "Số lượng bản ghi tối thiểu là 1")
    @Max(value = 100, message = "Số lượng bản ghi tối đa không vượt quá 100 để đảm bảo hiệu năng")
    @Builder.Default
    private Integer limit = 10;
}
