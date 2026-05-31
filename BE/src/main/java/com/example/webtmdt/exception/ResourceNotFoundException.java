package com.example.webtmdt.exception;

import org.springframework.http.HttpStatus;

/**
 * Throw khi không tìm thấy resource (entity) theo ID.
 * Ví dụ: throw new ResourceNotFoundException("Danh mục", "id", categoryId);
 * → message: "Không tìm thấy Danh mục với id: 5"
 */
public class ResourceNotFoundException extends AppException {

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(HttpStatus.NOT_FOUND,
                String.format("Không tìm thấy %s với %s: %s", resourceName, fieldName, fieldValue));
    }
}
