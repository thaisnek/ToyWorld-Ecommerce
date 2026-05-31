package com.example.webtmdt.repository;

import com.example.webtmdt.entity.LoyaltyTransaction;
import com.example.webtmdt.enums.LoyaltyTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {

    Page<LoyaltyTransaction> findByUserId(Long userId, Pageable pageable);

    boolean existsByOrderIdAndType(Long orderId, LoyaltyTransactionType type);
}
