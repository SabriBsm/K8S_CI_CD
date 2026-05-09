package com.microservices.apigateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuration CORS pour l'API Gateway
 * Permet les requêtes du frontend Angular (http://localhost:4200)
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.171:30080,http://192.168.1.188:30080,http://192.168.1.171:30085,http://192.168.1.188:30085}")
    private String allowedOrigins;

    private List<String> resolveAllowedOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .distinct()
                .toList();
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // Allow frontend origins
        corsConfig.setAllowedOrigins(resolveAllowedOrigins());

        // Allow all HTTP methods
        corsConfig.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // Allow headers
        corsConfig.setAllowedHeaders(Arrays.asList(
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "X-Auth-Token",
            "X-CSRF-TOKEN",
            "X-User-Id",
            "X-PlanSync-User-Id",
            "X-PlanSync-User-Email",
            "X-PlanSync-User-Role",
            "X-Username",
            "X-Roles"
        ));

        // Allow credentials (cookies, tokens)
        corsConfig.setAllowCredentials(true);

        // Maximum cache time for preflight requests (in seconds)
        corsConfig.setMaxAge(3600L);

        // Headers to expose to client
        corsConfig.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "X-Auth-Token",
            "X-CSRF-TOKEN",
            "X-User-Id",
            "X-PlanSync-User-Id",
            "X-PlanSync-User-Email",
            "X-PlanSync-User-Role",
            "X-Username",
            "X-Roles"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}

