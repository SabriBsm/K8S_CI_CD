package com.microservices.userservice.service;

public interface EmailService {

    void sendPasswordResetEmail(String toEmail, String username, String resetToken, String resetLink);

    void sendWelcomeEmail(String toEmail, String username);


    void sendUserOnboardingEmail(String toEmail, String username, String temporaryPassword, String loginUrl, String resetUrl);
}

