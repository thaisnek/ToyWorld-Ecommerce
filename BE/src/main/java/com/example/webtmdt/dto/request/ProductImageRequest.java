package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductImageRequest {

    @NotBlank(message = "URL ảnh không được để trống")
    private String imageUrl;

    private Boolean thumbnail = false;
}
