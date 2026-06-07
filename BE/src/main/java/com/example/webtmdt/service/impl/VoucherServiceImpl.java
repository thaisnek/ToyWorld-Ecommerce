package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.response.ApplyVoucherResponse;
import com.example.webtmdt.dto.request.TypeVoucherRequest;
import com.example.webtmdt.dto.request.VoucherRequest;
import com.example.webtmdt.dto.response.TypeVoucherResponse;
import com.example.webtmdt.dto.response.VoucherResponse;
import com.example.webtmdt.entity.TypeVoucher;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.entity.Voucher;
import com.example.webtmdt.enums.VoucherType;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.VoucherMapper;
import com.example.webtmdt.repository.TypeVoucherRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.repository.VoucherRepository;
import com.example.webtmdt.repository.VoucherUsedRepository;
import com.example.webtmdt.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final TypeVoucherRepository typeVoucherRepository;
    private final VoucherUsedRepository voucherUsedRepository;
    private final UserRepository userRepository;
    private final VoucherMapper voucherMapper;

    // ==================== ADMIN ====================

    @Override
    @Transactional
    public TypeVoucherResponse createTypeVoucher(TypeVoucherRequest request) {
        TypeVoucher typeVoucher = TypeVoucher.builder()
                .typeVoucher(request.getTypeVoucher())
                .value(request.getValue())
                .maxValue(request.getMaxValue())
                .minValue(request.getMinValue())
                .build();

        typeVoucher = typeVoucherRepository.save(typeVoucher);
        return voucherMapper.toTypeResponse(typeVoucher);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TypeVoucherResponse> getAllTypeVouchers() {
        return voucherMapper.toTypeResponseList(typeVoucherRepository.findAll());
    }

    @Override
    @Transactional
    public VoucherResponse createVoucher(VoucherRequest request) {
        TypeVoucher typeVoucher = typeVoucherRepository.findById(request.getTypeVoucherId())
                .orElseThrow(() -> new ResourceNotFoundException("Loại voucher", "id", request.getTypeVoucherId()));

        if (voucherRepository.findByCodeVoucher(request.getCodeVoucher()).isPresent()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã voucher đã tồn tại!");
        }

        Voucher voucher = Voucher.builder()
                .typeVoucher(typeVoucher)
                .codeVoucher(request.getCodeVoucher().toUpperCase())
                .fromDate(request.getFromDate())
                .toDate(request.getToDate())
                .quantity(request.getQuantity())
                .build();

        voucher = voucherRepository.save(voucher);
        return toVoucherResponse(voucher);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherResponse> getAllVouchers(Pageable pageable) {
        return voucherRepository.findAll(pageable).map(this::toVoucherResponse);
    }

    @Override
    @Transactional
    public void deleteVoucher(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", "id", id));
        if (voucher.getUsedQuantity() != null && voucher.getUsedQuantity() > 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Khong the xoa voucher da duoc su dung");
        }
        voucherRepository.delete(voucher);
    }

    // ==================== CUSTOMER ====================

    @Override
    @Transactional(readOnly = true)
    public ApplyVoucherResponse applyVoucher(String voucherCode, BigDecimal subtotal, String username) {
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung", "username", username));

        Voucher voucher = voucherRepository.findByCodeVoucher(voucherCode.toUpperCase())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Ma voucher khong hop le!"));

        BigDecimal discount = calculateDiscount(voucherCode, subtotal, user.getId());
        TypeVoucher type = voucher.getTypeVoucher();

        return ApplyVoucherResponse.builder()
                .codeVoucher(voucher.getCodeVoucher())
                .typeVoucher(type.getTypeVoucher().name())
                .value(type.getValue())
                .minValue(type.getMinValue())
                .maxValue(type.getMaxValue())
                .subtotal(subtotal)
                .discountAmount(discount)
                .totalAfterDiscount(subtotal.subtract(discount))
                .build();
    }

    // ==================== INTERNAL ====================

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateDiscount(String voucherCode, BigDecimal subtotal, Long userId) {
        Voucher voucher = voucherRepository.findByCodeVoucher(voucherCode.toUpperCase())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Mã voucher không hợp lệ!"));

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(voucher.getFromDate()) || now.isAfter(voucher.getToDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Voucher đã hết hạn!");
        }

        if (voucher.getUsedQuantity() >= voucher.getQuantity()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Voucher đã hết lượt sử dụng!");
        }

        if (voucherUsedRepository.existsByUserIdAndVoucherId(userId, voucher.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bạn đã sử dụng voucher này rồi!");
        }

        TypeVoucher type = voucher.getTypeVoucher();

        if (type.getMinValue() != null && subtotal.compareTo(type.getMinValue()) < 0) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng tối thiểu " + type.getMinValue() + " để áp dụng voucher này!");
        }

        BigDecimal discount;
        if (type.getTypeVoucher() == VoucherType.PERCENTAGE) {
            discount = subtotal.multiply(type.getValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.FLOOR);
            if (type.getMaxValue() != null && discount.compareTo(type.getMaxValue()) > 0) {
                discount = type.getMaxValue();
            }
        } else {
            discount = type.getValue();
        }

        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }

        return discount;
    }

    // ==================== HELPER ====================

    private VoucherResponse toVoucherResponse(Voucher voucher) {
        VoucherResponse response = voucherMapper.toResponse(voucher);
        response.setUsedCount(voucher.getUsedQuantity().longValue());
        return response;
    }
}
