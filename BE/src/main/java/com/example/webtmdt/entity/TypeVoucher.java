package com.example.webtmdt.entity;

import com.example.webtmdt.enums.VoucherType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "type_vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypeVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VoucherType typeVoucher;

    /** Giá trị giảm (% hoặc số tiền cố định) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal value;

    /** Giá trị giảm tối đa (dùng cho loại PERCENTAGE) */
    @Column(precision = 15, scale = 2)
    private BigDecimal maxValue;

    /** Giá trị đơn hàng tối thiểu để áp dụng */
    @Column(precision = 15, scale = 2)
    private BigDecimal minValue;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ========== RELATIONSHIPS ==========

    @OneToMany(mappedBy = "typeVoucher")
    @Builder.Default
    private List<Voucher> vouchers = new ArrayList<>();
}
