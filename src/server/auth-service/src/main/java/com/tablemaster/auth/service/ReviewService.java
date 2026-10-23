package com.tablemaster.auth.service;

import com.tablemaster.auth.dto.CreateReviewRequest;
import com.tablemaster.auth.dto.ReviewDto;
import com.tablemaster.auth.entity.Review;
import com.tablemaster.auth.entity.User;
import com.tablemaster.auth.repository.ReviewRepository;
import com.tablemaster.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    public static final int REVIEW_LOYALTY_POINTS_REWARD = 50;

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    @Transactional
    public ReviewDto createReview(String userIdStr, CreateReviewRequest request) {
        UUID userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản người dùng đã bị vô hiệu hóa");
        }

        if (request.getBookingId() != null && reviewRepository.existsByBookingIdAndUserId(request.getBookingId(), userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đặt bàn này đã được quý khách đánh giá trước đó");
        }

        int overallRating = request.getOverallRating() != null
                ? request.getOverallRating()
                : Math.round((request.getFoodRating() + request.getServiceRating() + request.getAmbianceRating()) / 3.0f);

        Review review = Review.builder()
                .user(user)
                .bookingId(request.getBookingId())
                .foodRating(request.getFoodRating())
                .serviceRating(request.getServiceRating())
                .ambianceRating(request.getAmbianceRating())
                .overallRating(overallRating)
                .comment(request.getComment() != null ? request.getComment().trim() : null)
                .pointsAwarded(REVIEW_LOYALTY_POINTS_REWARD)
                .build();

        review = reviewRepository.save(review);
        log.info("Saved review {} by user {} with overall rating {}", review.getId(), userId, overallRating);

        // Auto-award +50 loyalty points to diner
        authService.adjustLoyaltyPoints(userId, REVIEW_LOYALTY_POINTS_REWARD, "REVIEW_REWARD", review.getId().toString());

        return mapToDto(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> getMyReviews(String userIdStr) {
        UUID userId = parseUserId(userIdStr);
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> getRecentReviews(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Pageable pageable = PageRequest.of(0, safeLimit);
        return reviewRepository.findAllByOrderByCreatedAtDesc(pageable)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public ReviewDto mapToDto(Review review) {
        User user = review.getUser();
        return ReviewDto.builder()
                .id(review.getId())
                .userId(user != null ? user.getId() : null)
                .customerName(user != null ? user.getFullName() : "Khách hàng Le Prime")
                .customerAvatar(user != null ? user.getAvatarUrl() : null)
                .bookingId(review.getBookingId())
                .foodRating(review.getFoodRating())
                .serviceRating(review.getServiceRating())
                .ambianceRating(review.getAmbianceRating())
                .overallRating(review.getOverallRating())
                .comment(review.getComment())
                .pointsAwarded(review.getPointsAwarded())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private UUID parseUserId(String userIdStr) {
        try {
            return UUID.fromString(userIdStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identity in token");
        }
    }
}
