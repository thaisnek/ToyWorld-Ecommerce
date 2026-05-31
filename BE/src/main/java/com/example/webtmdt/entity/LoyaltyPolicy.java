package com.example.webtmdt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Số tiền cần chi để nhận 1 điểm (VD: 10000 = 10.000 VNĐ → 1 điểm) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPerPoint;

    /** Giá trị quy đổi của 1 điểm ra tiền (VD: 1000 = 1 điểm = 1.000 VNĐ) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal pointValue;

    /** Chính sách có đang được áp dụng không */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
