package com.example.webtmdt.dto.request;

import com.example.webtmdt.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRoleRequest {

    @NotNull(message = "Quyền hạn không được để trống")
    private UserRole role;
}
