package com.microservices.userservice.service;

import com.microservices.userservice.entity.RefreshToken;
import com.microservices.userservice.entity.User;
import com.microservices.userservice.exception.InvalidRefreshTokenException;
import com.microservices.userservice.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final Duration refreshTtl;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.jwt.refresh-token-ttl:P7D}") Duration refreshTtl
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTtl = refreshTtl;
    }

    @Transactional
    public RefreshToken issue(User user) {
        // Keep it simple: one active refresh token per user.
        refreshTokenRepository.deleteByUser(user);

        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString() + "." + UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(refreshTtl))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(rt);
    }

    @Transactional(readOnly = true)
    public RefreshToken requireValid(String token) {
        RefreshToken rt = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidRefreshTokenException("Invalid refresh token"));
        if (Boolean.TRUE.equals(rt.getRevoked())) {
            throw new InvalidRefreshTokenException("Refresh token revoked");
        }
        if (Instant.now().isAfter(rt.getExpiresAt())) {
            throw new InvalidRefreshTokenException("Refresh token expired");
        }
        return rt;
    }

    @Transactional
    public void revoke(RefreshToken rt) {
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);
    }
}
