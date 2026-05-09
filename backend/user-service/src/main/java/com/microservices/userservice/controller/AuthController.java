package com.microservices.userservice.controller;

import com.microservices.userservice.dto.request.ForgotPasswordRequestDTO;
import com.microservices.userservice.dto.request.LoginRequestDTO;
import com.microservices.userservice.dto.request.RefreshTokenRequestDTO;
import com.microservices.userservice.dto.request.RegisterRequestDTO;
import com.microservices.userservice.dto.request.ResetPasswordRequestDTO;
import com.microservices.userservice.dto.response.AuthResponseDTO;
import com.microservices.userservice.service.AuthTokenFacade;
import com.microservices.userservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication endpoints")
public class AuthController {

    private final UserService userService;
    private final AuthTokenFacade authTokenFacade;

    @PostMapping("/login")
    @Operation(summary = "Login a user")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Create a user account")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.register(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDTO request) {
        userService.forgotPassword(request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with token")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        userService.resetPassword(request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange refresh token for a new access token (refresh token rotation)")
    public ResponseEntity<AuthResponseDTO> refresh(@Valid @RequestBody RefreshTokenRequestDTO request) {
        return ResponseEntity.ok(authTokenFacade.refresh(request.getRefreshToken()));
    }
}
