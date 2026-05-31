package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.CategoryRequest;
import com.example.webtmdt.dto.response.CategoryResponse;

import java.util.List;

/**
 * ★ Pattern: Service Interface
 * - Định nghĩa tất cả operation cần thiết
 * - Controller chỉ inject interface này (loosely coupled)
 * - Logic thực tế nằm trong ServiceImpl
 */
public interface CategoryService {

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse getCategoryById(Long id);

    List<CategoryResponse> getAllCategories();

    List<CategoryResponse> getRootCategories();

    CategoryResponse updateCategory(Long id, CategoryRequest request);

    void deleteCategory(Long id);
}
