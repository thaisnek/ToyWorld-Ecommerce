package com.example.webtmdt.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "loyalty_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyAccount {

    /** userId vừa là PK vừa là FK tới Users */
    @Id
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    @Builder.Default
    private Long currentPoints = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long lifetimeEarnedPoints = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long lifetimeSpentPoints = 0L;
}
