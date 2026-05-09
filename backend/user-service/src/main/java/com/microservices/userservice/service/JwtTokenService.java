package com.microservices.userservice.service;

import com.microservices.userservice.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtTokenService(
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.access-token-ttl:PT5M}") Duration accessTtl,
            @Value("${app.jwt.refresh-token-ttl:P7D}") Duration refreshTtl
    ) {
        this.jwtEncoder = jwtEncoder;
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public String generateAccessToken(User user) {
        return generateToken(user, "access", accessTtl);
    }

    public String generateRefreshToken(User user) {
        return generateToken(user, "refresh", refreshTtl);
    }

    public long accessTokenExpiresInSeconds() {
        return accessTtl.toSeconds();
    }

    private String generateToken(User user, String tokenType, Duration ttl) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("plansync")
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                // Keep subject stable and opaque; user id is fine for internal services.
                .subject(String.valueOf(user.getId()))
                .claim("typ", tokenType)
                .claim("email", user.getEmail())
                .claim("username", user.getUsername())
                .claim("roles", List.of(user.getRole()))
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
