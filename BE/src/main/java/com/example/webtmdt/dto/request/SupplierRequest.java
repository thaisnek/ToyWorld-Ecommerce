package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupplierRequest {

    @NotBlank(message = "Tên nhà cung cấp không được để trống")
    private String name;

    private String contactPerson;

    @Email(message = "Email liên hệ không hợp lệ")
    private String contactEmail;

    private String contactPhone;

    private String address;

    private String contractInfo;

    private Boolean active = true;
}
