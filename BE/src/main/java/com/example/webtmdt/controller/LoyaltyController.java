package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.LoyaltyAccountResponse;
import com.example.webtmdt.dto.response.LoyaltyTransactionResponse;
import com.example.webtmdt.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loyalty")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    @GetMapping("/account")
    public ResponseEntity<ApiResponse<LoyaltyAccountResponse>> getMyAccount(
            @AuthenticationPrincipal UserDetails userDetails) {
        LoyaltyAccountResponse account = loyaltyService.getMyLoyaltyAccount(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tích điểm thành công!", account));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Page<LoyaltyTransactionResponse>>> getMyTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<LoyaltyTransactionResponse> transactions =
                loyaltyService.getMyTransactions(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử tích điểm thành công!", transactions));
    }
}
