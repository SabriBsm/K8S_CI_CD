package com.microservices.userservice.service;

import com.microservices.userservice.dto.response.AuthResponseDTO;
import com.microservices.userservice.entity.RefreshToken;
import com.microservices.userservice.entity.User;
import com.microservices.userservice.exception.InvalidRefreshTokenException;
import com.microservices.userservice.mapper.UserMapper;
import com.microservices.userservice.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthTokenFacade {

    private final RefreshTokenService refreshTokenService;
    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public AuthTokenFacade(
            RefreshTokenService refreshTokenService,
            JwtTokenService jwtTokenService,
            UserRepository userRepository,
            UserMapper userMapper
    ) {
        this.refreshTokenService = refreshTokenService;
        this.jwtTokenService = jwtTokenService;
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    @Transactional
    public AuthResponseDTO refresh(String refreshToken) {
        RefreshToken rt = refreshTokenService.requireValid(refreshToken);

        // Defensive: make sure the user still exists.
        User user = userRepository.findById(rt.getUser().getId())
                .orElseThrow(() -> new InvalidRefreshTokenException("User not found for refresh token"));

        // Rotation: revoke old refresh token and issue a new one.
        refreshTokenService.revoke(rt);
        RefreshToken newRt = refreshTokenService.issue(user);

        return AuthResponseDTO.builder()
                .accessToken(jwtTokenService.generateAccessToken(user))
                .refreshToken(newRt.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenService.accessTokenExpiresInSeconds())
                .user(userMapper.toResponseDTO(user))
                .build();
    }
}
