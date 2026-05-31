package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.ReviewRequest;
import com.example.webtmdt.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ReviewService {

    ReviewResponse createReview(String username, ReviewRequest request);

    /** Lấy review đã duyệt của sản phẩm (public) */
    Page<ReviewResponse> getApprovedReviewsByProduct(Long productId, Pageable pageable);

    /** Lấy tất cả review của sản phẩm (admin) */
    Page<ReviewResponse> getAllReviewsByProduct(Long productId, Pageable pageable);

    Page<ReviewResponse> getAllReviews(Pageable pageable);

    List<ReviewResponse> getMyReviews(String username);

    ReviewResponse approveReview(Long reviewId);

    void deleteReview(Long reviewId);
}
