package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByProductIdAndApprovedTrue(Long productId, Pageable pageable);

    Page<Review> findByProductId(Long productId, Pageable pageable);

    List<Review> findByCustomerId(Long customerId);

    boolean existsByOrderItemId(Long orderItemId);
}
