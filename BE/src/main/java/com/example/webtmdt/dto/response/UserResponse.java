package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class UserResponse {

    private Long id;
    private String fullName;
    private String userName;
    private String email;
    private String phone;
    private String role;
    private String status;
    private LocalDateTime createdAt;
}
