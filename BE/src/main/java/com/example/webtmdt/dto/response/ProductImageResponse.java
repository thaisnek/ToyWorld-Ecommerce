package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductImageResponse {

    private Long id;
    private String imageUrl;
    private Boolean thumbnail;
}
