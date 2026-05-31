package com.example.webtmdt.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Custom exception dùng chung cho toàn bộ application.
 * Khi throw exception này, GlobalExceptionHandler sẽ tự động bắt
 * và trả về ApiResponse với status + message tương ứng.
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;

    public AppException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
