package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.UserResponse;
import com.example.webtmdt.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping("/delivery-staff")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getActiveDeliveryStaff() {
        return ResponseEntity.ok(ApiResponse.success("Get active delivery staff successfully", userService.getActiveDeliveryStaff()));
    }
}
