package com.example.webtmdt.enums;

public enum PaymentStatus {
    PENDING,   // Chờ thanh toán
    PAID,      // Đã thanh toán
    FAILED,    // Thanh toán thất bại
    CANCELLED, // Đã hủy trước khi thanh toán
    REFUNDED   // Đã hoàn tiền
}
