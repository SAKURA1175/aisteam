package com.tutormarket.api.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomain(DomainException exception, HttpServletRequest request) {
        return ResponseEntity.status(exception.status())
                .body(ErrorResponse.from(exception.status(), exception.getMessage(), request));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class, ConstraintViolationException.class})
    public ResponseEntity<ErrorResponse> handleValidation(Exception exception, HttpServletRequest request) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.from(HttpStatus.BAD_REQUEST, exception.getMessage(), request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.from(HttpStatus.FORBIDDEN, "Access denied", request));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.from(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request));
    }

    public record ErrorResponse(
            Instant timestamp,
            int status,
            String error,
            String message,
            String path,
            String requestId
    ) {
        static ErrorResponse from(HttpStatus status, String message, HttpServletRequest request) {
            return new ErrorResponse(
                    Instant.now(),
                    status.value(),
                    status.getReasonPhrase(),
                    message,
                    request.getRequestURI(),
                    (String) request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
            );
        }
    }
}
