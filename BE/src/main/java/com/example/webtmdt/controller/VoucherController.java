package com.example.webtmdt.controller;

import com.example.webtmdt.dto.request.TypeVoucherRequest;
import com.example.webtmdt.dto.request.VoucherRequest;
import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.TypeVoucherResponse;
import com.example.webtmdt.dto.response.VoucherResponse;
import com.example.webtmdt.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @PostMapping("/api/admin/vouchers/types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TypeVoucherResponse>> createTypeVoucher(
            @Valid @RequestBody TypeVoucherRequest request) {
        TypeVoucherResponse type = voucherService.createTypeVoucher(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tao loai voucher thanh cong!", type));
    }

    @GetMapping("/api/admin/vouchers/types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TypeVoucherResponse>>> getAllTypeVouchers() {
        List<TypeVoucherResponse> types = voucherService.getAllTypeVouchers();
        return ResponseEntity.ok(ApiResponse.success("Lay danh sach loai voucher thanh cong!", types));
    }

    @PostMapping("/api/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherResponse>> createVoucher(
            @Valid @RequestBody VoucherRequest request) {
        VoucherResponse voucher = voucherService.createVoucher(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tao voucher thanh cong!", voucher));
    }

    @GetMapping("/api/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<VoucherResponse>>> getAllVouchers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<VoucherResponse> vouchers = voucherService.getAllVouchers(pageable);
        return ResponseEntity.ok(ApiResponse.success("Lay danh sach voucher thanh cong!", vouchers));
    }

    @DeleteMapping("/api/admin/vouchers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteVoucher(@PathVariable Long id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok(ApiResponse.success("Xoa voucher thanh cong!", null));
    }
}
