package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.ReviewRequest;
import com.example.webtmdt.dto.response.ReviewResponse;
import com.example.webtmdt.entity.*;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.ReviewMapper;
import com.example.webtmdt.repository.OrderItemRepository;
import com.example.webtmdt.repository.ReviewRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ReviewMapper reviewMapper;

    @Override
    @Transactional
    public ReviewResponse createReview(String username, ReviewRequest request) {
        User user = findUserOrThrow(username);

        OrderItem orderItem = orderItemRepository.findById(request.getOrderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Mục đơn hàng", "id", request.getOrderItemId()));

        // Check đơn hàng thuộc về user
        if (!orderItem.getOrder().getCustomer().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền đánh giá mục này");
        }

        // Check đơn hàng đã giao
        OrderStatus status = orderItem.getOrder().getOrderStatus();
        if (status != OrderStatus.DELIVERED && status != OrderStatus.COMPLETED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể đánh giá sau khi nhận hàng");
        }

        // Check chưa review
        if (reviewRepository.existsByOrderItemId(request.getOrderItemId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bạn đã đánh giá sản phẩm này rồi");
        }

        Review review = Review.builder()
                .product(orderItem.getVariant().getProduct())
                .customer(user)
                .orderItem(orderItem)
                .rating(request.getRating())
                .comment(request.getComment())
                .approved(false) // Admin duyệt trước khi hiển thị
                .build();

        review = reviewRepository.save(review);
        return reviewMapper.toResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getApprovedReviewsByProduct(Long productId, Pageable pageable) {
        return reviewRepository.findByProductIdAndApprovedTrue(productId, pageable)
                .map(reviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviewsByProduct(Long productId, Pageable pageable) {
        return reviewRepository.findByProductId(productId, pageable)
                .map(reviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviews(Pageable pageable) {
        return reviewRepository.findAll(pageable)
                .map(reviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String username) {
        User user = findUserOrThrow(username);
        return reviewMapper.toResponseList(reviewRepository.findByCustomerId(user.getId()));
    }

    @Override
    @Transactional
    public ReviewResponse approveReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá", "id", reviewId));
        review.setApproved(true);
        review = reviewRepository.save(review);
        return reviewMapper.toResponse(review);
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá", "id", reviewId));
        reviewRepository.delete(review);
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
    }
}
