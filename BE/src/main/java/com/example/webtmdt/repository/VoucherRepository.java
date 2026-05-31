package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeVoucher(String codeVoucher);

    @Modifying
    @Query("UPDATE Voucher v SET v.usedQuantity = v.usedQuantity + 1 WHERE v.id = :id AND v.usedQuantity < v.quantity")
    int incrementUsedQuantity(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Voucher v SET v.usedQuantity = CASE WHEN v.usedQuantity > 0 THEN v.usedQuantity - 1 ELSE 0 END WHERE v.id = :id")
    int decrementUsedQuantity(@Param("id") Long id);
}
