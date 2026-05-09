package com.microservices.projetservice.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@plansync.local}")
    private String fromAddress;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    public void sendMemberAddedNotificationEmail(String toEmail, String recipientName, String projectName, String role) {
        String subject = "You have been added to project: " + projectName;
        String dashboardUrl = frontendUrl + "/projects";
        String body = "<html><body style='font-family:Arial,sans-serif;color:#1f2937;'>"
                + "<h2 style='color:#1f2937;'>Welcome to the project</h2>"
                + "<p>Hello " + safeName(recipientName) + ",</p>"
                + "<p>You have been added to <strong>" + escape(projectName) + "</strong> as <strong>" + escape(role) + "</strong>.</p>"
                + "<p>You can open the application and check your project notifications here:</p>"
                + button(dashboardUrl, "Open Projects")
                + "<p style='margin-top:16px;'>Best regards,<br/>PlanSync Pro</p>"
                + "</body></html>";
        sendHtmlEmail(toEmail, subject, body);
    }

    public void sendUnreadNotificationReminderEmail(String toEmail, String recipientName, String projectName, String notificationMessage) {
        String subject = "Reminder: unread project notification";
        String dashboardUrl = frontendUrl + "/projects";
        String body = "<html><body style='font-family:Arial,sans-serif;color:#1f2937;'>"
                + "<h2 style='color:#b45309;'>Reminder</h2>"
                + "<p>Hello " + safeName(recipientName) + ",</p>"
                + "<p>You still have an unread notification related to <strong>" + escape(projectName) + "</strong>.</p>"
                + "<p>Notification: <em>" + escape(notificationMessage) + "</em></p>"
                + "<p>Please open the app and mark it as read when done.</p>"
                + button(dashboardUrl, "Open Projects")
                + "<p style='margin-top:16px;'>Best regards,<br/>PlanSync Pro</p>"
                + "</body></html>";
        sendHtmlEmail(toEmail, subject, body);
    }

    public void sendProjectNotificationEmail(String toEmail, String recipientName, String projectName, String notificationMessage) {
        String subject = "Project notification: " + projectName;
        String dashboardUrl = frontendUrl + "/projects";
        String body = "<html><body style='font-family:Arial,sans-serif;color:#1f2937;'>"
                + "<h2 style='color:#1f2937;'>New project notification</h2>"
                + "<p>Hello " + safeName(recipientName) + ",</p>"
                + "<p>You received a notification related to <strong>" + escape(projectName) + "</strong>.</p>"
                + "<p>Notification: <em>" + escape(notificationMessage) + "</em></p>"
                + button(dashboardUrl, "Open Projects")
                + "<p style='margin-top:16px;'>Best regards,<br/>PlanSync Pro</p>"
                + "</body></html>";
        sendHtmlEmail(toEmail, subject, body);
    }

    private void sendHtmlEmail(String toEmail, String subject, String body) {
        if (!isMailConfigured()) {
            log.warn("Mail delivery skipped because SMTP is not fully configured (missing credentials or sender)");
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(mimeMessage);
            log.info("Email sent to {} with subject {}", toEmail, subject);
        } catch (MessagingException e) {
            log.error("Unable to build email message for {}", toEmail, e);
        } catch (Exception e) {
            log.error("Unable to send email to {}", toEmail, e);
        }
    }

    private boolean isMailConfigured() {
        return fromAddress != null && !fromAddress.isBlank()
                && smtpUsername != null && !smtpUsername.isBlank()
                && smtpPassword != null && !smtpPassword.isBlank();
    }

    private String button(String url, String label) {
        return "<p><a href='" + escape(url) + "' style='display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;'>"
                + escape(label)
                + "</a></p>";
    }

    private String safeName(String value) {
        return (value == null || value.isBlank()) ? "User" : escape(value);
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

