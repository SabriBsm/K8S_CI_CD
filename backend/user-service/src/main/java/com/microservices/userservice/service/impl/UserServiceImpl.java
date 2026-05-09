package com.microservices.userservice.service.impl;

import com.microservices.userservice.dto.request.LoginRequestDTO;
import com.microservices.userservice.dto.request.RegisterRequestDTO;
import com.microservices.userservice.dto.request.ForgotPasswordRequestDTO;
import com.microservices.userservice.dto.request.ResetPasswordRequestDTO;
import com.microservices.userservice.dto.request.ChangePasswordRequestDTO;
import com.microservices.userservice.dto.request.NotifyUserRequestDTO;
import com.microservices.userservice.dto.request.SessionUsageRequestDTO;
import com.microservices.userservice.dto.request.UserRequestDTO;
import com.microservices.userservice.dto.request.UpdateUserRequestDTO;
import com.microservices.userservice.dto.response.AuthResponseDTO;
import com.microservices.userservice.dto.response.UserResponseDTO;
import com.microservices.userservice.dto.response.analytics.UsageDashboardDTO;
import com.microservices.userservice.dto.response.analytics.UsagePeriodRankingDTO;
import com.microservices.userservice.dto.response.analytics.UsageRankEntryDTO;
import com.microservices.userservice.entity.User;
import com.microservices.userservice.enums.UserStatus;
import com.microservices.userservice.exception.InvalidPasswordException;
import com.microservices.userservice.exception.TokenExpiredException;
import com.microservices.userservice.exception.UserAlreadyExistsException;
import com.microservices.userservice.exception.UserNotFoundException;
import com.microservices.userservice.mapper.UserMapper;
import com.microservices.userservice.repository.UserRepository;
import com.microservices.userservice.service.AvatarStorageService;
import com.microservices.userservice.service.UserService;
import com.microservices.userservice.service.EmailService;
import com.microservices.userservice.service.JwtTokenService;
import com.microservices.userservice.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Locale;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AvatarStorageService avatarStorageService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Override
    public AuthResponseDTO login(LoginRequestDTO request) {
        log.info("Tentative de connexion pour: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .or(() -> userRepository.findByUsername(request.getEmail()))
                .orElseThrow(() -> new UserNotFoundException("Utilisateur introuvable"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidPasswordException("Identifiants invalides");
        }

        if (user.getStatus() == UserStatus.PENDING) {
            user.setStatus(UserStatus.ACTIVE);
        }

        user.setLastLoginAt(java.time.LocalDateTime.now());
        if (user.getTotalAppUsageSeconds() == null) {
            user.setTotalAppUsageSeconds(0L);
        }

        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Override
    public AuthResponseDTO register(RegisterRequestDTO request) {
        log.info("Inscription utilisateur: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Un utilisateur avec cet email existe déjà");
        }

        String baseUsername = request.getEmail().split("@")[0]
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        if (baseUsername.length() < 3) {
            baseUsername = "user" + UUID.randomUUID().toString().substring(0, 6);
        }

        String username = baseUsername;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + suffix++;
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole() != null ? request.getRole() : "PROJECT_MEMBER")
                .status(UserStatus.PENDING)
                .build();

        User savedUser = userRepository.save(user);

        try {
            emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getUsername());
        } catch (Exception e) {
            log.warn("L'email de bienvenue n'a pas pu être envoyé à {}", savedUser.getEmail(), e);
        }

        return buildAuthResponse(savedUser);
    }

    @Override
    public UserResponseDTO createUser(UserRequestDTO request) {
        log.info("Création d'un nouvel utilisateur avec l'email: {}", request.getEmail());

        String username = request.getUsername();
        if (username == null || username.isBlank()) {
            String baseUsername = request.getEmail().split("@")[0]
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9._-]", "");
            if (baseUsername.length() < 3) {
                baseUsername = "user" + UUID.randomUUID().toString().substring(0, 6);
            }
            username = baseUsername;
            int suffix = 1;
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + suffix++;
            }
            request.setUsername(username);
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Un utilisateur avec le nom d'utilisateur '" + request.getUsername() + "' existe déjà");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Un utilisateur avec l'email '" + request.getEmail() + "' existe déjà");
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(parseUserStatus(request.getStatus()));
        User savedUser = userRepository.save(user);

        log.info("Utilisateur créé avec succès avec l'ID: {}", savedUser.getId());
        return userMapper.toResponseDTO(savedUser);
    }

    @Override
    public UserResponseDTO uploadAvatar(Long userId, MultipartFile avatar) {
        log.info("Mise à jour de l'avatar pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        try {
            String avatarUrl = avatarStorageService.storeAvatar(avatar);
            user.setAvatarUrl(avatarUrl);
            User updatedUser = userRepository.save(user);
            return userMapper.toResponseDTO(updatedUser);
        } catch (Exception e) {
            throw new RuntimeException("Unable to upload avatar", e);
        }
    }

    @Override
    public UserResponseDTO updateUser(Long id, UpdateUserRequestDTO request) {
        log.info("Mise à jour de l'utilisateur avec l'ID: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + id));

        userMapper.updateEntityFromDTO(request, user);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            user.setStatus(parseUserStatus(request.getStatus()));
        }
        User updatedUser = userRepository.save(user);

        log.info("Utilisateur mis à jour avec succès avec l'ID: {}", id);
        return userMapper.toResponseDTO(updatedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        log.info("Récupération de l'utilisateur avec l'ID: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + id));

        return userMapper.toResponseDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserByUsername(String username) {
        log.info("Récupération de l'utilisateur avec le nom d'utilisateur: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec le nom d'utilisateur: " + username));

        return userMapper.toResponseDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserByEmail(String email) {
        log.info("Récupération de l'utilisateur avec l'email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'email: " + email));

        return userMapper.toResponseDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getUsersByRole(String role) {
        log.info("Récupération des utilisateurs avec le rôle: {}", role);

        return userRepository.findByRole(role)
                .stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getActiveUsersByRole(String role) {
        log.info("Récupération des utilisateurs actifs avec le rôle: {}", role);

        return userRepository.findActiveUsersByRole(role)
                .stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponseDTO> getAllUsers(Pageable pageable) {
        log.info("Récupération de tous les utilisateurs avec pagination");

        return userRepository.findAll(pageable)
                .map(userMapper::toResponseDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        log.info("Récupération de tous les utilisateurs");

        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteUser(Long id) {
        log.info("Suppression de l'utilisateur avec l'ID: {}", id);

        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
        }

        userRepository.deleteById(id);
        log.info("Utilisateur supprimé avec succès avec l'ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    @Transactional(readOnly = true)
    public Boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public void incrementFailedLoginAttempts(Long userId) {
        log.info("Incrémentation des tentatives de connexion échouées pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
        userRepository.save(user);
    }

    @Override
    public void resetFailedLoginAttempts(Long userId) {
        log.info("Réinitialisation des tentatives de connexion échouées pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }

    @Override
    public void changePassword(Long userId, ChangePasswordRequestDTO request) {
        log.info("Changement du mot de passe pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new InvalidPasswordException("L'ancien mot de passe est incorrect");
        }

        if (request.getOldPassword().equals(request.getNewPassword())) {
            throw new InvalidPasswordException("Le nouveau mot de passe doit être différent de l'ancien");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public void notifyUser(Long userId, NotifyUserRequestDTO request) {
        log.info("Notification utilisateur envoyée pour l'ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        user.setPassword(passwordEncoder.encode(request.getTemporaryPassword()));
        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        String loginUrl = frontendUrl + "/auth/login";
        String resetUrl = frontendUrl + "/auth/reset-password?token=" + resetToken;

        emailService.sendUserOnboardingEmail(
                user.getEmail(),
                user.getUsername(),
                request.getTemporaryPassword(),
                loginUrl,
                resetUrl
        );
    }

    @Override
    public void forgotPassword(ForgotPasswordRequestDTO request) {
        log.info("Password reset request for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException("No user registered with this e-mail."));

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        String resetLink = frontendUrl + "/auth/reset-password?token=" + token;

        try {
            log.debug("Attempting to send password reset email to: {}", user.getEmail());
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), token, resetLink);
            log.info("Password reset token generated and email sent successfully for user: {}", user.getId());
        } catch (Exception e) {
            log.error("Error sending password reset email to: {}", user.getEmail(), e);
            log.warn("Password reset token was generated but email could not be sent. Token: {}. Error: {}", token, e.getMessage());
            // Continue even if email fails - the token is still valid and can be used with direct link
        }
    }

    @Override
    public void resetPassword(ResetPasswordRequestDTO request) {
        log.info("Password reset with token");

        User user = userRepository.findByResetToken(request.getToken())
                .orElseThrow(() -> new UserNotFoundException("Invalid password reset token"));

        if (user.getResetTokenExpiry() == null || LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            throw new TokenExpiredException("Password reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password reset successfully for user: {}", user.getId());
    }

    @Override
    public UserResponseDTO recordSessionUsage(Long userId, SessionUsageRequestDTO request) {
        log.info("Enregistrement du temps de session pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        long durationSeconds = request.getSessionDurationSeconds() == null ? 0L : Math.max(0L, request.getSessionDurationSeconds());
        long currentUsage = user.getTotalAppUsageSeconds() == null ? 0L : user.getTotalAppUsageSeconds();
        user.setTotalAppUsageSeconds(currentUsage + durationSeconds);

        User updatedUser = userRepository.save(user);
        return userMapper.toResponseDTO(updatedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UsageDashboardDTO getUsageDashboard(String timezone, Integer limit) {
        int rankingLimit = limit == null || limit <= 0 ? 10 : limit;

        List<User> users = userRepository.findAll();
        Map<Long, UsageAccumulator> usageByUser = new HashMap<>();

        for (User user : users) {
            long totalSeconds = user.getTotalAppUsageSeconds() == null ? 0L : Math.max(0L, user.getTotalAppUsageSeconds());
            usageByUser.put(user.getId(), UsageAccumulator.from(user));
            usageByUser.get(user.getId()).add(totalSeconds);
        }

        long totalUsers = usageByUser.size();
        long totalSeconds = usageByUser.values().stream().mapToLong(UsageAccumulator::getTotalSeconds).sum();

        List<UsageRankEntryDTO> rankedUsers = usageByUser.values().stream()
                .map(UsageAccumulator::toDto)
                .sorted(Comparator.comparingLong(UsageRankEntryDTO::getTotalSeconds).reversed()
                        .thenComparing(UsageRankEntryDTO::getDisplayName, String.CASE_INSENSITIVE_ORDER))
                .limit(rankingLimit)
                .toList();

        UsageRankEntryDTO topUser = rankedUsers.isEmpty() ? null : rankedUsers.get(0);

        return UsageDashboardDTO.builder()
                .generatedAt(java.time.LocalDateTime.now())
                .scope("GLOBAL")
                .totalUsers(totalUsers)
                .totalSeconds(totalSeconds)
                .totalMinutes(totalSeconds / 60d)
                .totalHours(totalSeconds / 3600d)
                .globalRanking(UsagePeriodRankingDTO.builder()
                        .scope("GLOBAL")
                        .totalUsers(totalUsers)
                        .totalSeconds(totalSeconds)
                        .totalMinutes(totalSeconds / 60d)
                        .totalHours(totalSeconds / 3600d)
                        .users(rankedUsers)
                        .build())
                .topUser(topUser)
                .build();
    }

    private AuthResponseDTO buildAuthResponse(User user) {
        UserResponseDTO userResponse = userMapper.toResponseDTO(user);
        var refreshToken = refreshTokenService.issue(user);
        return AuthResponseDTO.builder()
                .accessToken(jwtTokenService.generateAccessToken(user))
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenService.accessTokenExpiresInSeconds())
                .user(userResponse)
                .build();
    }

    private UserStatus parseUserStatus(String status) {
        if (status == null || status.isBlank()) {
            return UserStatus.PENDING;
        }

        try {
            return UserStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return UserStatus.PENDING;
        }
    }

    private static class UsageAccumulator {
        private final User user;
        private final String displayName;
        private long totalSeconds;

        private UsageAccumulator(User user) {
            this.user = user;
            this.displayName = String.join(" ",
                    safeTrimStatic(user.getFirstName()),
                    safeTrimStatic(user.getLastName())).trim();
        }

        private static UsageAccumulator from(User user) {
            return new UsageAccumulator(user);
        }

        private void add(long seconds) {
            totalSeconds += seconds;
        }

        private long getTotalSeconds() {
            return totalSeconds;
        }

        private UsageRankEntryDTO toDto() {
            return UsageRankEntryDTO.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .displayName(displayName == null || displayName.isBlank()
                            ? (user.getUsername() != null && !user.getUsername().isBlank() ? user.getUsername() : (user.getEmail() != null ? user.getEmail() : "Utilisateur"))
                            : displayName)
                    .totalSeconds(totalSeconds)
                    .totalMinutes(totalSeconds / 60d)
                    .totalHours(totalSeconds / 3600d)
                    .build();
        }
    }

    private static String safeTrimStatic(String value) {
        return value == null ? "" : value.trim();
    }
}

