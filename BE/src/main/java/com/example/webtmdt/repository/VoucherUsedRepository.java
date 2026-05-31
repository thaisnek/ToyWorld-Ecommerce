package com.example.webtmdt.repository;

import com.example.webtmdt.entity.VoucherUsed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherUsedRepository extends JpaRepository<VoucherUsed, Long> {

    boolean existsByUserIdAndVoucherId(Long userId, Long voucherId);

    long countByVoucherId(Long voucherId);

    void deleteByUserIdAndVoucherId(Long userId, Long voucherId);
}
