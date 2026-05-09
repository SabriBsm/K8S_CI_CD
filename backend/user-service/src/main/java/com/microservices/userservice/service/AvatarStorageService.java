package com.microservices.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvatarStorageService {

    @Value("${app.avatar.local-dir:uploads/avatars}")
    private String localDirectory;

    @Value("${app.avatar.public-path:/avatars/}")
    private String publicPath;

    @Value("${app.avatar.public-base-url:http://localhost:${SERVER_PORT:8079}}")
    private String publicBaseUrl;

    public String storeAvatar(MultipartFile avatar) {
        validateAvatar(avatar);

        try {
            byte[] content = avatar.getBytes();
            String mimeType = resolveMimeType(avatar);
            String fileName = buildStoredFileName(avatar.getOriginalFilename(), mimeType);

            Path localPath = saveLocalCopy(content, fileName);
            String publicUrl = buildPublicUrl(fileName);

            log.info("Avatar saved locally at {} and exposed at {}", localPath, publicUrl);
            return publicUrl;
        } catch (IOException e) {
            throw new IllegalStateException("Unable to store avatar image", e);
        }
    }

    private void validateAvatar(MultipartFile avatar) {
        if (avatar == null || avatar.isEmpty()) {
            throw new IllegalArgumentException("Avatar file is required");
        }
    }

    private Path saveLocalCopy(byte[] content, String fileName) throws IOException {
        Path directory = Paths.get(localDirectory).toAbsolutePath().normalize();
        Files.createDirectories(directory);

        Path targetFile = directory.resolve(fileName);
        Files.write(targetFile, content);
        return targetFile;
    }

    private String buildPublicUrl(String fileName) {
        String basePath = publicPath == null || publicPath.isBlank() ? "/avatars/" : publicPath;
        if (!basePath.endsWith("/")) {
            basePath = basePath + "/";
        }

        String baseUrl = publicBaseUrl == null || publicBaseUrl.isBlank()
                ? "http://localhost:8079"
                : publicBaseUrl;
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + basePath + fileName;
    }

    private String buildStoredFileName(String originalFilename, String mimeType) {
        String extension = resolveExtension(originalFilename, mimeType);
        return UUID.randomUUID() + extension;
    }

    private String resolveMimeType(MultipartFile avatar) {
        if (avatar.getContentType() != null && !avatar.getContentType().isBlank()) {
            return avatar.getContentType();
        }
        return "image/png";
    }

    private String resolveExtension(String originalFilename, String mimeType) {
        String lowerName = originalFilename == null ? "" : originalFilename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            return ".jpg";
        }
        if (lowerName.endsWith(".png")) {
            return ".png";
        }
        if (lowerName.endsWith(".gif")) {
            return ".gif";
        }
        if (lowerName.endsWith(".webp")) {
            return ".webp";
        }

        if (mimeType == null) {
            return ".png";
        }

        return switch (mimeType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".png";
        };
    }
}

