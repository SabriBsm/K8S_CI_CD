package com.microservices.userservice.service.impl;

import com.microservices.userservice.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@ConditionalOnProperty(
    name = "spring.mail.enabled",
    havingValue = "true",
    matchIfMissing = true
)
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender javaMailSender;
    @Value("${spring.mail.username:noreply@plansync.io}")
    private String mailFrom;

    private String getValidFromAddress() {
        if (mailFrom == null || mailFrom.isBlank() || !mailFrom.contains("@")) {
            log.warn("Invalid mailFrom address: '{}'. Falling back to 'noreply@plansync.io'", mailFrom);
            return "noreply@plansync.io";
        }
        return mailFrom;
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String username, String resetToken, String resetLink) {
        try {
            log.info("Sending password reset email to: {}", toEmail);

            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(getValidFromAddress());
            helper.setTo(toEmail);
            helper.setSubject("PlanSyncPro - Password Reset");

            String htmlContent = buildPasswordResetEmailTemplate(username, resetToken, resetLink);
            helper.setText(htmlContent, true);

            javaMailSender.send(mimeMessage);
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            log.error("MessagingException while sending password reset email to: {}. Details: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Error sending email: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error while sending password reset email to: {}. Details: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Unexpected error sending email: " + e.getMessage(), e);
        }
    }

    @Override
    public void sendWelcomeEmail(String toEmail, String username) {
        try {
            log.info("Sending welcome email to: {}", toEmail);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(getValidFromAddress());
            message.setTo(toEmail);
            message.setSubject("Welcome to PlanSyncPro!");
            message.setText("Hello " + username + ",\n\nWelcome to PlanSyncPro!\n\nYour account has been created successfully.");

            javaMailSender.send(message);
            log.info("Welcome email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Error sending welcome email to: {}", toEmail, e);
            // Don't re-throw to allow registration to succeed even if email fails
        }
    }

    @Override
    public void sendUserOnboardingEmail(String toEmail, String username, String temporaryPassword, String loginUrl, String resetUrl) {
        try {
            log.info("Sending onboarding email to: {}", toEmail);

            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(getValidFromAddress());
            helper.setTo(toEmail);
            helper.setSubject("PlanSyncPro - Your account is ready");
            helper.setText(buildUserOnboardingEmailTemplate(toEmail, username, temporaryPassword, loginUrl, resetUrl), true);

            javaMailSender.send(mimeMessage);
            log.info("Onboarding email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            log.error("MessagingException while sending onboarding email to: {}. Details: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Error sending email: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error while sending onboarding email to: {}. Details: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Unexpected error sending email: " + e.getMessage(), e);
        }
    }


    private String buildPasswordResetEmailTemplate(String username, String resetToken, String resetLink) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <style>\n" +
                "        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; }\n" +
                "        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }\n" +
                "        .content { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }\n" +
                "        .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }\n" +
                "        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }\n" +
                "        .token { background: #f0f0f0; padding: 10px; border-radius: 3px; font-family: monospace; word-break: break-all; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <div class=\"header\">\n" +
                "            <h1>Password Reset Request</h1>\n" +
                "        </div>\n" +
                "        <div class=\"content\">\n" +
                "            <p>Hello <strong>" + username + "</strong>,</p>\n" +
                "            <p>You have requested to reset your password.</p>\n" +
                "            <p>Click the button below to reset your password:</p>\n" +
                "            <a href=\"" + resetLink + "\" class=\"button\">Reset My Password</a>\n" +
                "            <p>Or use this code:</p>\n" +
                "            <div class=\"token\">" + resetToken + "</div>\n" +
                "            <p><strong>Important:</strong> This link expires in 1 hour.</p>\n" +
                "            <p>If you did not request this password reset, please ignore this email.</p>\n" +
                "        </div>\n" +
                "        <div class=\"footer\">\n" +
                "            <p>© 2026 PlanSyncPro. All rights reserved.</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    private String buildUserOnboardingEmailTemplate(String toEmail, String username, String temporaryPassword, String loginUrl, String resetUrl) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <style>\n" +
                "        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n" +
                "        .container { max-width: 650px; margin: 0 auto; background: #f5f7fb; padding: 24px; }\n" +
                "        .header { background: linear-gradient(135deg, #4f46e5, #2563eb); color: white; padding: 22px; text-align: center; border-radius: 10px; }\n" +
                "        .content { background: white; padding: 24px; margin: 20px 0; border-radius: 10px; }\n" +
                "        .button { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 8px 10px 0; }\n" +
                "        .secondary { background: #0f766e; }\n" +
                "        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }\n" +
                "        .token { background: #f3f4f6; padding: 12px 14px; border-radius: 8px; font-family: monospace; word-break: break-all; font-size: 1rem; }\n" +
                "        .note { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 14px; border-radius: 6px; margin-top: 14px; }\n" +
                "        ul { padding-left: 18px; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <div class=\"header\">\n" +
                "            <h1>Your PlanSyncPro account is ready</h1>\n" +
                "        </div>\n" +
                "        <div class=\"content\">\n" +
                "            <p>Hello <strong>" + username + "</strong>,</p>\n" +
                "            <p>An administrator has created your account. You can now log in and complete your profile.</p>\n" +
                "            <p><strong>Login email:</strong> " + toEmail + "</p>\n" +
                "            <p><strong>Temporary password:</strong></p>\n" +
                "            <div class=\"token\">" + temporaryPassword + "</div>\n" +
                "            <p>First, change your password using the secure link below:</p>\n" +
                "            <a href=\"" + resetUrl + "\" class=\"button\">Change Password</a>\n" +
                "            <a href=\"" + loginUrl + "\" class=\"button secondary\">Go to Login</a>\n" +
                "            <div class=\"note\">\n" +
                "                <strong>After your first login, please:</strong>\n" +
                "                <ul>\n" +
                "                    <li>change your password immediately</li>\n" +
                "                    <li>update your personal information such as phone number</li>\n" +
                "                    <li>upload or change your profile photo</li>\n" +
                "                </ul>\n" +
                "            </div>\n" +
                "            <p>If you have any issue, contact your administrator.</p>\n" +
                "        </div>\n" +
                "        <div class=\"footer\">\n" +
                "            <p>© 2026 PlanSyncPro. All rights reserved.</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

}

