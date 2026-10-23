package com.tablemaster.auth.controller;

import com.tablemaster.auth.dto.CreateReviewRequest;
import com.tablemaster.auth.dto.ReviewDto;
import com.tablemaster.auth.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewDto> createReview(@Valid @RequestBody CreateReviewRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        ReviewDto response = reviewService.createReview(userIdStr, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<ReviewDto>> getMyReviews() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        return ResponseEntity.ok(reviewService.getMyReviews(userIdStr));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ReviewDto>> getRecentReviews(
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(reviewService.getRecentReviews(limit));
    }
}
