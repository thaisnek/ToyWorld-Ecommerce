package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.ProductImageResponse;
import com.example.webtmdt.dto.response.ProductResponse;
import com.example.webtmdt.dto.response.ProductVariantResponse;
import com.example.webtmdt.entity.Product;
import com.example.webtmdt.entity.ProductImage;
import com.example.webtmdt.entity.ProductVariant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct Mapper cho Product + Variant + Image.
 * Thay thế ~45 dòng code thủ công trong ProductServiceImpl.
 */
@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    @Mapping(source = "supplier.id", target = "supplierId")
    @Mapping(source = "supplier.name", target = "supplierName")
    ProductResponse toResponse(Product product);

    List<ProductResponse> toResponseList(List<Product> products);

    ProductVariantResponse toVariantResponse(ProductVariant variant);

    ProductImageResponse toImageResponse(ProductImage image);
}
