package com.architext.controller;

import com.architext.dto.ApiResponse;
import com.architext.dto.LoginRequest;
import com.architext.dto.SignupRequest;
import com.architext.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        try {
            return ResponseEntity.ok(authService.signup(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout(@AuthenticationPrincipal UserDetails userDetails) {
        authService.logout(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully."));
    }
}