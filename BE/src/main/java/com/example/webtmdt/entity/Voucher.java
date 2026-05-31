package com.example.webtmdt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_voucher_id", nullable = false)
    private TypeVoucher typeVoucher;

    @Column(nullable = false)
    private LocalDateTime fromDate;

    @Column(nullable = false)
    private LocalDateTime toDate;

    /** Số lượng mã được tung ra */
    @Column(nullable = false)
    private Integer quantity;

    /** Số lượng mã đã được sử dụng */
    @Column(nullable = false)
    @Builder.Default
    private Integer usedQuantity = 0;

    @Column(nullable = false, unique = true)
    private String codeVoucher;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ========== RELATIONSHIPS ==========

    @OneToMany(mappedBy = "voucher", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VoucherUsed> voucherUseds = new ArrayList<>();

    @OneToMany(mappedBy = "voucher")
    @Builder.Default
    private List<Order> orders = new ArrayList<>();
}
