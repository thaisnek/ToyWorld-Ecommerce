package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.CategoryRequest;
import com.example.webtmdt.dto.response.CategoryResponse;
import com.example.webtmdt.entity.Category;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.CategoryMapper;
import com.example.webtmdt.repository.CategoryRepository;
import com.example.webtmdt.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ★ Pattern: ServiceImpl
 *
 * Flow chuẩn cho mỗi method:
 * 1. Validate input / kiểm tra tồn tại
 * 2. Thực hiện business logic
 * 3. Gọi repository để lưu/truy vấn
 * 4. Dùng Mapper để convert Entity → Response DTO
 * 5. Trả về Response DTO (KHÔNG BAO GIỜ trả Entity ra ngoài)
 *
 * Lưu ý:
 * - Dùng @Transactional cho write operations
 * - Dùng @Transactional(readOnly = true) cho read operations
 * - Throw ResourceNotFoundException khi không tìm thấy entity
 */
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    // ==================== CREATE ====================

    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .imageUrl(request.getImageUrl())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        // Set parent nếu có
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục cha", "id", request.getParentId()));
            category.setParent(parent);
        }

        category = categoryRepository.save(category);
        return toResponseWithChildren(category);
    }

    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = findCategoryOrThrow(id);
        return toResponseWithChildren(category);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getRootCategories() {
        return categoryRepository.findByParentIsNullAndActiveTrueOrderByIdAsc().stream()
                .map(this::toResponseWithChildren)
                .collect(Collectors.toList());
    }

    // ==================== UPDATE ====================

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = findCategoryOrThrow(id);

        // Update fields
        category.setName(request.getName());
        category.setImageUrl(request.getImageUrl());

        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }

        // Update parent
        if (request.getParentId() != null) {
            if (request.getParentId().equals(id)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Danh muc khong the la cha cua chinh no");
            }
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục cha", "id", request.getParentId()));
            ensureParentIsNotDescendant(category, parent);
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        category = categoryRepository.save(category);
        return toResponseWithChildren(category);
    }

    // ==================== DELETE ====================

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = findCategoryOrThrow(id);
        deactivateCategoryTree(category);
        categoryRepository.save(category);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Tìm Category theo ID hoặc throw ResourceNotFoundException.
     * ★ Extract method này ra để tái sử dụng, tránh lặp code.
     */
    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", id));
    }

    /**
     * Convert entity -> response, including active descendants.
     */
    private void ensureParentIsNotDescendant(Category category, Category parent) {
        Category current = parent;
        while (current != null) {
            if (current.getId().equals(category.getId())) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Khong the chuyen danh muc vao chinh nhanh con cua no");
            }
            current = current.getParent();
        }
    }

    private void deactivateCategoryTree(Category category) {
        category.setActive(false);
        if (category.getChildren() != null) {
            category.getChildren().forEach(this::deactivateCategoryTree);
        }
    }

    private CategoryResponse toResponseWithChildren(Category category) {
        CategoryResponse response = categoryMapper.toResponse(category);

        // Map active children recursively so FE can render the category tree.
        if (category.getChildren() != null && !category.getChildren().isEmpty()) {
            List<CategoryResponse> childResponses = category.getChildren().stream()
                    .filter(child -> child.getActive() != Boolean.FALSE)
                    .sorted(Comparator.comparing(Category::getId))
                    .map(this::toResponseWithChildren)
                    .collect(Collectors.toList());
            response.setChildren(childResponses);
        }

        return response;
    }
}
