package com.microservices.userservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Configuration pour le service d'email
 */
@Configuration
@Slf4j
public class EmailConfig {

    /**
     * Crée un JavaMailSender mock quand l'email n'est pas configuré
     */
    @Bean
    @ConditionalOnProperty(
        name = "spring.mail.enabled",
        havingValue = "false",
        matchIfMissing = false
    )
    public JavaMailSender mockJavaMailSender() {
        log.warn("========== EMAIL SERVICE DISABLED - USING MOCK ==========");
        log.warn("Les emails ne seront pas envoyés. Mode développement activé.");
        log.warn("Pour activer l'email réel, configurez spring.mail.enabled=true");
        log.warn("=========================================================");

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(1025); // Port pour un serveur mail mock

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "false");
        props.put("mail.smtp.starttls.enable", "false");

        return sender;
    }
}

