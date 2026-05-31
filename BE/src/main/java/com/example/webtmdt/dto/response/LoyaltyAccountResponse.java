package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class LoyaltyAccountResponse {

    private Long userId;
    private String userName;
    private Long currentPoints;
    private Long lifetimeEarnedPoints;
    private Long lifetimeSpentPoints;
}
