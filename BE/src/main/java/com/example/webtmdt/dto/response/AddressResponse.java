package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AddressResponse {

    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String fullAddress;
    private Boolean isDefault;
    private LocalDateTime createdAt;
}
