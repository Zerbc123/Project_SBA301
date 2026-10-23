package com.tablemaster.auth;

import com.tablemaster.auth.dto.CreateReviewRequest;
import com.tablemaster.auth.dto.ReviewDto;
import com.tablemaster.auth.entity.Review;
import com.tablemaster.auth.entity.User;
import com.tablemaster.auth.entity.UserRole;
import com.tablemaster.auth.repository.ReviewRepository;
import com.tablemaster.auth.repository.UserRepository;
import com.tablemaster.auth.service.AuthService;
import com.tablemaster.auth.service.ReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthService authService;

    @InjectMocks
    private ReviewService reviewService;

    private User activeCustomer;
    private User disabledCustomer;
    private UUID customerId;

    @BeforeEach
    void setUp() {
        customerId = UUID.fromString("b0000000-0000-0000-0000-000000000001");
        activeCustomer = User.builder()
                .id(customerId)
                .email("customer@primebistro.vn")
                .phoneNumber("+84912345678")
                .fullName("Trần Thị B")
                .role(UserRole.ROLE_CUSTOMER)
                .isActive(true)
                .loyaltyPoints(100)
                .avatarUrl("https://example.com/b.jpg")
                .build();

        disabledCustomer = User.builder()
                .id(UUID.fromString("b0000000-0000-0000-0000-000000000002"))
                .email("blocked@primebistro.vn")
                .phoneNumber("+84988888888")
                .fullName("Blocked Customer")
                .role(UserRole.ROLE_CUSTOMER)
                .isActive(false)
                .build();
    }

    @Test
    @DisplayName("UC-14 Scenario 1: Create review successfully awards +50 loyalty points")
    void testCreateReviewSuccess_Awards50LoyaltyPoints() {
        UUID bookingId = UUID.randomUUID();
        CreateReviewRequest request = CreateReviewRequest.builder()
                .bookingId(bookingId)
                .foodRating(5)
                .serviceRating(4)
                .ambianceRating(5)
                .overallRating(5)
                .comment("Bò Wagyu rất mềm, vang đỏ chuẩn vị, phục vụ tận tình!")
                .build();

        UUID reviewId = UUID.randomUUID();
        Review mockSaved = Review.builder()
                .id(reviewId)
                .user(activeCustomer)
                .bookingId(bookingId)
                .foodRating(5)
                .serviceRating(4)
                .ambianceRating(5)
                .overallRating(5)
                .comment("Bò Wagyu rất mềm, vang đỏ chuẩn vị, phục vụ tận tình!")
                .pointsAwarded(50)
                .createdAt(ZonedDateTime.now())
                .build();

        when(userRepository.findById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(reviewRepository.existsByBookingIdAndUserId(bookingId, customerId)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenReturn(mockSaved);

        ReviewDto result = reviewService.createReview(customerId.toString(), request);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(reviewId);
        assertThat(result.getCustomerName()).isEqualTo("Trần Thị B");
        assertThat(result.getPointsAwarded()).isEqualTo(50);
        assertThat(result.getFoodRating()).isEqualTo(5);
        assertThat(result.getComment()).contains("Bò Wagyu");

        // Verify +50 loyalty points adjustment was triggered
        verify(authService, times(1)).adjustLoyaltyPoints(
                eq(customerId),
                eq(50),
                eq("REVIEW_REWARD"),
                eq(reviewId.toString())
        );
    }

    @Test
    @DisplayName("UC-14 Scenario 2: Automatically calculates average overall rating when omitted")
    void testCreateReview_CalculatesAverageOverallRating() {
        CreateReviewRequest request = CreateReviewRequest.builder()
                .foodRating(5)
                .serviceRating(3)
                .ambianceRating(4)
                .overallRating(null)
                .comment("Hài lòng")
                .build();

        when(userRepository.findById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> {
            Review r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            r.setCreatedAt(ZonedDateTime.now());
            return r;
        });

        ReviewDto result = reviewService.createReview(customerId.toString(), request);

        assertThat(result).isNotNull();
        // (5 + 3 + 4) / 3 = 4
        assertThat(result.getOverallRating()).isEqualTo(4);
    }

    @Test
    @DisplayName("UC-14 Scenario 3: Duplicate review for the same booking is rejected with CONFLICT")
    void testCreateReview_DuplicateBookingThrowsConflict() {
        UUID bookingId = UUID.randomUUID();
        CreateReviewRequest request = CreateReviewRequest.builder()
                .bookingId(bookingId)
                .foodRating(4)
                .serviceRating(4)
                .ambianceRating(4)
                .build();

        when(userRepository.findById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(reviewRepository.existsByBookingIdAndUserId(bookingId, customerId)).thenReturn(true);

        assertThatThrownBy(() -> reviewService.createReview(customerId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(reviewRepository, never()).save(any(Review.class));
        verify(authService, never()).adjustLoyaltyPoints(any(), anyInt(), any(), any());
    }

    @Test
    @DisplayName("UC-14 Scenario 4: Inactive account cannot submit review (FORBIDDEN)")
    void testCreateReview_InactiveAccountThrowsForbidden() {
        UUID disabledId = disabledCustomer.getId();
        when(userRepository.findById(disabledId)).thenReturn(Optional.of(disabledCustomer));

        CreateReviewRequest request = CreateReviewRequest.builder()
                .foodRating(5)
                .serviceRating(5)
                .ambianceRating(5)
                .build();

        assertThatThrownBy(() -> reviewService.createReview(disabledId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(reviewRepository, never()).save(any(Review.class));
    }

    @Test
    @DisplayName("UC-14 Scenario 5: getMyReviews returns user's past reviews")
    void testGetMyReviews() {
        Review r1 = Review.builder()
                .id(UUID.randomUUID())
                .user(activeCustomer)
                .foodRating(5)
                .serviceRating(5)
                .ambianceRating(5)
                .overallRating(5)
                .comment("Tuyệt vời")
                .pointsAwarded(50)
                .createdAt(ZonedDateTime.now())
                .build();

        when(reviewRepository.findByUserIdOrderByCreatedAtDesc(customerId)).thenReturn(List.of(r1));

        List<ReviewDto> list = reviewService.getMyReviews(customerId.toString());

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getCustomerName()).isEqualTo("Trần Thị B");
        assertThat(list.get(0).getPointsAwarded()).isEqualTo(50);
    }

    @Test
    @DisplayName("UC-14 Scenario 6: getRecentReviews respects pagination limit")
    void testGetRecentReviews() {
        Review r1 = Review.builder()
                .id(UUID.randomUUID())
                .user(activeCustomer)
                .foodRating(4)
                .serviceRating(4)
                .ambianceRating(4)
                .overallRating(4)
                .pointsAwarded(50)
                .createdAt(ZonedDateTime.now())
                .build();

        when(reviewRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(List.of(r1));

        List<ReviewDto> list = reviewService.getRecentReviews(5);

        assertThat(list).hasSize(1);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(reviewRepository).findAllByOrderByCreatedAtDesc(captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(5);
    }
}
