package com.tablemaster.auth.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReviewRequest {

    private UUID bookingId;

    @NotNull(message = "Đánh giá chất lượng món ăn không được để trống")
    @Min(value = 1, message = "Đánh giá món ăn tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá món ăn tối đa 5 sao")
    private Integer foodRating;

    @NotNull(message = "Đánh giá thái độ phục vụ không được để trống")
    @Min(value = 1, message = "Đánh giá phục vụ tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá phục vụ tối đa 5 sao")
    private Integer serviceRating;

    @NotNull(message = "Đánh giá không gian không được để trống")
    @Min(value = 1, message = "Đánh giá không gian tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá không gian tối đa 5 sao")
    private Integer ambianceRating;

    @Min(value = 1, message = "Đánh giá tổng thể tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá tổng thể tối đa 5 sao")
    private Integer overallRating;

    @Size(max = 1000, message = "Nhận xét không được vượt quá 1000 ký tự")
    private String comment;
}
