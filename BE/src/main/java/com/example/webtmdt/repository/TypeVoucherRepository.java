package com.example.webtmdt.repository;

import com.example.webtmdt.entity.TypeVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TypeVoucherRepository extends JpaRepository<TypeVoucher, Long> {
}
