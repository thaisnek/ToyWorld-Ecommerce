package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.CategoryResponse;
import com.example.webtmdt.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

/**
 * MapStruct Mapper cho Category.
 * Spring sẽ tự tạo implementation class lúc compile.
 *
 * ★ Pattern: Mỗi entity tạo 1 Mapper tương ứng.
 *   - toResponse(): Entity → Response DTO
 *   - toResponseList(): List<Entity> → List<Response DTO>
 */
@Mapper(componentModel = "spring")
public interface CategoryMapper {

    @Mapping(source = "parent.id", target = "parentId")
    @Mapping(source = "parent.name", target = "parentName")
    @Mapping(target = "children", ignore = true) // sẽ map thủ công trong service nếu cần
    CategoryResponse toResponse(Category category);

    List<CategoryResponse> toResponseList(List<Category> categories);
}
