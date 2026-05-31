package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class CategoryResponse {

    private Long id;
    private String name;
    private String imageUrl;
    private Boolean active;

    // Parent info
    private Long parentId;
    private String parentName;

    // Children (chỉ 1 cấp)
    private List<CategoryResponse> children;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
