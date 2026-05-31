package com.example.webtmdt.enums;

public enum OrderStatus {
    PENDING,      // Chờ xác nhận
    CONFIRMED,    // Đã xác nhận
    SHIPPING,     // Đang giao hàng
    DELIVERED,    // Đã giao hàng
    COMPLETED,    // Hoàn thành
    CANCELLED     // Đã hủy
}
