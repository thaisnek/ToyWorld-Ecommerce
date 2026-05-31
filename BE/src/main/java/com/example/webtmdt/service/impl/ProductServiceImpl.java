package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.ProductImageRequest;
import com.example.webtmdt.dto.request.ProductRequest;
import com.example.webtmdt.dto.request.ProductVariantRequest;
import com.example.webtmdt.dto.response.ProductResponse;
import com.example.webtmdt.entity.*;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.ProductMapper;
import com.example.webtmdt.repository.CategoryRepository;
import com.example.webtmdt.repository.OrderItemRepository;
import com.example.webtmdt.repository.ProductRepository;
import com.example.webtmdt.repository.SupplierRepository;
import com.example.webtmdt.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final String ACTIVE_PRODUCT_STATUS = "ACTIVE";

    private static final List<OrderStatus> SOLD_ORDER_STATUSES = List.of(
            OrderStatus.COMPLETED
    );

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductMapper productMapper;

    // ==================== CREATE ====================

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .brand(request.getBrand())
                .material(request.getMaterial())
                .basePrice(request.getBasePrice())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .build();

        product.setCategory(findLeafCategoryOrThrow(request.getCategoryId()));
        // Set Supplier
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", request.getSupplierId()));
            product.setSupplier(supplier);
        }

        // Save product first to get ID
        product = productRepository.save(product);

        // Add Variants
        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            for (ProductVariantRequest variantReq : request.getVariants()) {
                ProductVariant variant = ProductVariant.builder()
                        .product(product)
                        .color(variantReq.getColor())
                        .size(variantReq.getSize())
                        .priceOverride(variantReq.getPriceOverride())
                        .stockQuantity(variantReq.getStockQuantity() != null ? variantReq.getStockQuantity() : 0)
                        .active(variantReq.getActive() != null ? variantReq.getActive() : true)
                        .build();
                product.getVariants().add(variant);
            }
        }

        // Add Images
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (ProductImageRequest imageReq : request.getImages()) {
                ProductImage image = ProductImage.builder()
                        .product(product)
                        .imageUrl(imageReq.getImageUrl())
                        .thumbnail(imageReq.getThumbnail() != null ? imageReq.getThumbnail() : false)
                        .build();
                product.getImages().add(image);
            }
        }

        product = productRepository.save(product);
        return toProductResponse(product);
    }

    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = findProductOrThrow(id);
        if (!ACTIVE_PRODUCT_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("San pham", "id", id);
        }
        return toProductResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return toProductResponsePage(productRepository.findByStatus(ACTIVE_PRODUCT_STATUS, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsForAdmin(String keyword, Long categoryId, String status, Pageable pageable) {
        List<Long> categoryIds = List.of(-1L);
        boolean filterByCategory = categoryId != null;
        if (filterByCategory) {
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Danh muc", "id", categoryId));
            categoryIds = new ArrayList<>();
            collectCategoryTreeIds(category, categoryIds);
        }

        String normalizedStatus = status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                ? null
                : status;
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

        return toProductResponsePage(productRepository.findCatalogProducts(
                normalizedStatus,
                filterByCategory,
                categoryIds,
                normalizedKeyword,
                pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsByCategory(Long categoryId, Pageable pageable) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", categoryId));
        List<Long> categoryIds = new ArrayList<>();
        collectCategoryTreeIds(category, categoryIds);
        return toProductResponsePage(productRepository.findCatalogProducts(
                ACTIVE_PRODUCT_STATUS,
                true,
                categoryIds,
                null,
                pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsBySupplier(Long supplierId, Pageable pageable) {
        return toProductResponsePage(productRepository.findBySupplierIdAndStatus(supplierId, ACTIVE_PRODUCT_STATUS, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(String keyword, Pageable pageable) {
        return toProductResponsePage(productRepository.findCatalogProducts(
                ACTIVE_PRODUCT_STATUS,
                false,
                List.of(-1L),
                keyword,
                pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> filterByPrice(BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        return toProductResponsePage(productRepository.findByStatusAndBasePriceBetween(
                ACTIVE_PRODUCT_STATUS,
                minPrice,
                maxPrice,
                pageable));
    }

    // ==================== UPDATE ====================

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = findProductOrThrow(id);

        // Update basic fields
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setBrand(request.getBrand());
        product.setMaterial(request.getMaterial());
        product.setBasePrice(request.getBasePrice());

        if (request.getStatus() != null) {
            product.setStatus(request.getStatus());
        }

        product.setCategory(findLeafCategoryOrThrow(request.getCategoryId()));

        // Update Supplier
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", request.getSupplierId()));
            product.setSupplier(supplier);
        } else {
            product.setSupplier(null);
        }

        // Update Variants: xóa cũ, thêm mới
        if (request.getVariants() != null) {
            Map<Long, ProductVariant> existingVariantsById = product.getVariants().stream()
                    .filter(variant -> variant.getId() != null)
                    .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));
            Set<Long> requestedVariantIds = new HashSet<>();

            for (ProductVariantRequest variantReq : request.getVariants()) {
                ProductVariant variant;
                if (variantReq.getId() != null) {
                    variant = existingVariantsById.get(variantReq.getId());
                    if (variant == null) {
                        throw new AppException(HttpStatus.BAD_REQUEST, "Phan loai san pham khong thuoc san pham nay");
                    }
                    requestedVariantIds.add(variant.getId());
                } else {
                    variant = ProductVariant.builder()
                            .product(product)
                            .build();
                    product.getVariants().add(variant);
                }

                applyVariantRequest(variant, variantReq);
            }

            product.getVariants().stream()
                    .filter(variant -> variant.getId() != null && !requestedVariantIds.contains(variant.getId()))
                    .forEach(variant -> variant.setActive(false));
        }

        // Update Images: xóa cũ, thêm mới
        if (request.getImages() != null) {
            product.getImages().clear();
            for (ProductImageRequest imageReq : request.getImages()) {
                ProductImage image = ProductImage.builder()
                        .product(product)
                        .imageUrl(imageReq.getImageUrl())
                        .thumbnail(imageReq.getThumbnail() != null ? imageReq.getThumbnail() : false)
                        .build();
                product.getImages().add(image);
            }
        }

        product = productRepository.save(product);
        return toProductResponse(product);
    }

    // ==================== DELETE ====================

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProductOrThrow(id);
        product.setStatus("INACTIVE");
        product.getVariants().forEach(variant -> variant.setActive(false));
        productRepository.save(product);
    }

    // ==================== HELPER ====================

    private Page<ProductResponse> toProductResponsePage(Page<Product> products) {
        List<Long> productIds = products.getContent().stream()
                .map(Product::getId)
                .toList();
        Map<Long, Long> soldByProductId = getSoldCounts(productIds);

        return products.map(product -> toProductResponse(product, soldByProductId));
    }

    private void applyVariantRequest(ProductVariant variant, ProductVariantRequest variantReq) {
        variant.setColor(variantReq.getColor());
        variant.setSize(variantReq.getSize());
        variant.setPriceOverride(variantReq.getPriceOverride());
        variant.setStockQuantity(variantReq.getStockQuantity() != null ? variantReq.getStockQuantity() : 0);
        variant.setActive(variantReq.getActive() != null ? variantReq.getActive() : true);
    }

    private ProductResponse toProductResponse(Product product) {
        return toProductResponse(product, getSoldCounts(List.of(product.getId())));
    }

    private ProductResponse toProductResponse(Product product, Map<Long, Long> soldByProductId) {
        ProductResponse response = productMapper.toResponse(product);
        response.setSold(soldByProductId.getOrDefault(product.getId(), 0L));
        return response;
    }

    private Map<Long, Long> getSoldCounts(List<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        return orderItemRepository.sumSoldByProductIds(productIds, SOLD_ORDER_STATUSES).stream()
                .collect(Collectors.toMap(
                        OrderItemRepository.ProductSoldProjection::getProductId,
                        projection -> projection.getSold() == null ? 0L : projection.getSold()
                ));
    }

    private void collectCategoryTreeIds(Category category, List<Long> categoryIds) {
        categoryIds.add(category.getId());
        if (category.getChildren() == null) {
            return;
        }

        category.getChildren().forEach(child -> collectCategoryTreeIds(child, categoryIds));
    }

    private Category findLeafCategoryOrThrow(Long categoryId) {
        if (categoryId == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Danh muc san pham la bat buoc");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", categoryId));

        if (category.getChildren() != null && !category.getChildren().isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "San pham chi duoc gan vao danh muc con");
        }

        return category;
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));
    }
}
