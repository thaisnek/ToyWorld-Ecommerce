package com.example.webtmdt.service;

import com.example.webtmdt.dto.response.ImageUploadResponse;
import com.example.webtmdt.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ProductImageStorageService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private final Path uploadDir;
    private final String contextPath;

    public ProductImageStorageService(
            @Value("${app.upload.product-image-dir:uploads/products}") String uploadPath,
            @Value("${server.servlet.context-path:}") String contextPath) {
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        this.contextPath = normalizeContextPath(contextPath);
    }

    public ImageUploadResponse store(MultipartFile file) {
        validate(file);

        String extension = getExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + "." + extension;

        try {
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(fileName).normalize();

            if (!target.startsWith(uploadDir)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Tên file ảnh không hợp lệ");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu ảnh sản phẩm");
        }

        return ImageUploadResponse.builder()
                .fileName(fileName)
                .imageUrl(contextPath + "/uploads/products/" + fileName)
                .build();
    }

    public Path getUploadDir() {
        return uploadDir;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file ảnh");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ảnh sản phẩm không được vượt quá 5MB");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
        }
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "";
        }

        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalFilename.length() - 1) {
            return "";
        }

        return originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeContextPath(String value) {
        if (value == null || value.isBlank() || "/".equals(value)) {
            return "";
        }

        String normalized = value.startsWith("/") ? value : "/" + value;
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }
}
