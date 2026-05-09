package com.microservices.userservice.service.impl;

import com.microservices.userservice.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Mock email service for development/testing mode
 * Activated when spring.mail.enabled=false
 */
@Service
@ConditionalOnProperty(
    name = "spring.mail.enabled",
    havingValue = "false",
    matchIfMissing = false
)
@Slf4j
public class MockEmailServiceImpl implements EmailService {

    @Override
    public void sendPasswordResetEmail(String toEmail, String username, String resetToken, String resetLink) {
        log.info("========== MOCK EMAIL - PASSWORD RESET ==========");
        log.info("TO: {}", toEmail);
        log.info("USERNAME: {}", username);
        log.info("RESET TOKEN: {}", resetToken);
        log.info("RESET LINK: {}", resetLink);
        log.info("================================================");
    }

    @Override
    public void sendWelcomeEmail(String toEmail, String username) {
        log.info("========== MOCK EMAIL - WELCOME ==========");
        log.info("TO: {}", toEmail);
        log.info("USERNAME: {}", username);
        log.info("==========================================");
    }

    @Override
    public void sendUserOnboardingEmail(String toEmail, String username, String temporaryPassword, String loginUrl, String resetUrl) {
        log.info("========== MOCK EMAIL - USER ONBOARDING ==========");
        log.info("TO: {}", toEmail);
        log.info("USERNAME: {}", username);
        log.info("TEMP PASSWORD: {}", temporaryPassword);
        log.info("LOGIN URL: {}", loginUrl);
        log.info("RESET URL: {}", resetUrl);
        log.info("====================================================");
    }

}



