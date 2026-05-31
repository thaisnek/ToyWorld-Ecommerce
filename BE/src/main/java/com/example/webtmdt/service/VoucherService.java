package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.TypeVoucherRequest;
import com.example.webtmdt.dto.request.VoucherRequest;
import com.example.webtmdt.dto.response.TypeVoucherResponse;
import com.example.webtmdt.dto.response.VoucherResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface VoucherService {

    // ===== Admin =====
    TypeVoucherResponse createTypeVoucher(TypeVoucherRequest request);

    List<TypeVoucherResponse> getAllTypeVouchers();

    VoucherResponse createVoucher(VoucherRequest request);

    Page<VoucherResponse> getAllVouchers(Pageable pageable);

    void deleteVoucher(Long id);

    // ===== Internal =====

    /**
     * Validate voucher và trả về discountAmount.
     * Dùng nội bộ bởi OrderService.
     */
    BigDecimal calculateDiscount(String voucherCode, BigDecimal subtotal, Long userId);
}
