# Backend Implementation for Forgot Password Feature

## Overview
This document describes the backend implementation requirements for the "Forgot Password" functionality in the PlanSync Pro Java microservice.

## Required API Endpoints

### 1. Forgot Password Endpoint
**POST** `/api/auth/forgot-password`

#### Request Body:
```json
{
  "email": "user@example.com"
}
```

#### Response (Success - 200):
```json
{
  "message": "Password reset link sent to your email",
  "success": true
}
```

#### Response (Error - 400):
```json
{
  "message": "Email not found",
  "success": false
}
```

#### Functionality:
1. Receive email address from request
2. Verify email exists in database
3. Generate unique reset token (JWT or UUID with expiration)
4. Store reset token with user (temporary, with expiration)
5. Send email with reset link containing token
6. Return success message

#### Example Reset Email Link:
```
http://localhost:4200/auth/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2. Reset Password Endpoint
**POST** `/api/auth/reset-password`

#### Request Body:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

#### Response (Success - 200):
```json
{
  "message": "Password reset successfully",
  "success": true
}
```

#### Response (Error - 400):
```json
{
  "message": "Invalid or expired token",
  "success": false
}
```

#### Response (Error - 400):
```json
{
  "message": "Password does not meet requirements",
  "success": false
}
```

#### Functionality:
1. Receive reset token and new password
2. Validate token exists and is not expired
3. Find associated user
4. Validate password strength (minimum 8 characters, recommended complexity)
5. Hash and update password in database
6. Invalidate reset token (delete from database)
7. Optionally: Send confirmation email
8. Return success message

---

## Database Schema Changes

### User Entity (Existing)
Add fields for password reset:
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ... existing fields ...
    
    // Password reset fields
    @Column(name = "reset_token")
    private String resetToken;
    
    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;
    
    // ... other fields ...
}
```

Or create a separate table:

```sql
CREATE TABLE password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Java Implementation Example

### 1. DTO Classes:

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ForgotPasswordRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
}

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResetPasswordRequest {
    @NotBlank(message = "Token is required")
    private String token;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;
}

@Data
@AllArgsConstructor
public class AuthResponse {
    private String message;
    private boolean success;
}
```

### 2. Password Reset Token Service:

```java
@Service
@Slf4j
public class PasswordResetService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Value("${app.jwt.secret}")
    private String jwtSecret;
    
    @Value("${app.reset-token.expiry-hours:24}")
    private int tokenExpiryHours;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    /**
     * Generate password reset token and send email
     */
    public void sendPasswordResetEmail(String email) throws Exception {
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            throw new ResourceNotFoundException("User with email " + email + " not found");
        }
        
        User user = userOpt.get();
        
        // Generate reset token (valid for 24 hours)
        String resetToken = generateResetToken(user.getId());
        
        // Store token in database
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(tokenExpiryHours));
        userRepository.save(user);
        
        // Send email with reset link
        String resetLink = frontendUrl + "/auth/reset-password?token=" + resetToken;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), resetLink);
        
        log.info("Password reset email sent to: {}", email);
    }
    
    /**
     * Reset password using token
     */
    public void resetPassword(String token, String newPassword) throws Exception {
        // Validate token format and expiry
        Optional<User> userOpt = userRepository.findByResetToken(token);
        
        if (userOpt.isEmpty()) {
            throw new BadRequestException("Invalid reset token");
        }
        
        User user = userOpt.get();
        
        // Check token expiry
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token has expired");
        }
        
        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
        
        // Send confirmation email
        emailService.sendPasswordResetConfirmationEmail(user.getEmail(), user.getFirstName());
        
        log.info("Password reset successful for user: {}", user.getEmail());
    }
    
    /**
     * Generate reset token (using JWT)
     */
    private String generateResetToken(Long userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "password_reset");
        
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(userId.toString())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + (tokenExpiryHours * 60 * 60 * 1000)))
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }
}
```

### 3. Auth Controller Updates:

```java
@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {
    
    @Autowired
    private PasswordResetService passwordResetService;
    
    /**
     * Forgot password - send reset email
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.sendPasswordResetEmail(request.getEmail());
            return ResponseEntity.ok(new AuthResponse("Password reset link sent to your email", true));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.badRequest()
                .body(new AuthResponse("Email not found", false));
        } catch (Exception e) {
            log.error("Error sending password reset email", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthResponse("Failed to send reset email", false));
        }
    }
    
    /**
     * Reset password with token
     */
    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(new AuthResponse("Password reset successfully", true));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                .body(new AuthResponse(e.getMessage(), false));
        } catch (Exception e) {
            log.error("Error resetting password", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthResponse("Failed to reset password", false));
        }
    }
}
```

---

## Email Service Implementation

### Email Template (forgot-password.html):

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset Request</title>
</head>
<body>
    <h2>Password Reset Request</h2>
    <p>Hello {{firstName}},</p>
    <p>We received a request to reset your PlanSync Pro password.</p>
    <p>Click the link below to reset your password (link valid for 24 hours):</p>
    <p>
        <a href="{{resetLink}}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Reset Password
        </a>
    </p>
    <p>Or copy and paste this link in your browser:</p>
    <p>{{resetLink}}</p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>Best regards,<br>PlanSync Pro Team</p>
</body>
</html>
```

---

## Configuration Properties

Add to `application.properties` or `application.yml`:

```properties
# Password Reset Configuration
app.reset-token.expiry-hours=24
app.frontend.url=http://localhost:4200

# Email Configuration
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true

# Or for your mail provider
app.mail.from=noreply@plansync.io
app.mail.from-name=PlanSync Pro
```

---

## Security Considerations

1. **Token Expiration**: Set reasonable expiration (recommended: 24 hours)
2. **One-time Use**: Tokens should be invalidated after successful use
3. **Rate Limiting**: Limit password reset requests per user/IP
4. **SSL/TLS**: Always use HTTPS for password reset flows
5. **Password Hashing**: Use BCrypt or Argon2 for password hashing
6. **Audit Logging**: Log all password reset attempts
7. **Token Storage**: Use secure storage for reset tokens
8. **Email Verification**: Consider verifying email before allowing reset

---

## Testing

### Unit Tests:

```java
@SpringBootTest
public class PasswordResetServiceTest {
    
    @MockBean
    private UserRepository userRepository;
    
    @MockBean
    private EmailService emailService;
    
    @Autowired
    private PasswordResetService passwordResetService;
    
    @Test
    public void testSendPasswordResetEmail_Success() throws Exception {
        // Arrange
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        
        // Act
        passwordResetService.sendPasswordResetEmail("test@example.com");
        
        // Assert
        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString());
        assertNotNull(user.getResetToken());
        assertNotNull(user.getResetTokenExpiry());
    }
    
    @Test
    public void testSendPasswordResetEmail_UserNotFound() {
        // Arrange
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            passwordResetService.sendPasswordResetEmail("nonexistent@example.com");
        });
    }
}
```

---

## Dependencies Required

```xml
<!-- JWT Token -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.11.5</version>
</dependency>

<!-- Email -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Thymeleaf for email templates -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

---

## Deployment Checklist

- [ ] Email service configured and tested
- [ ] Database migrations applied (reset token fields added)
- [ ] JWT secret configured in environment
- [ ] Frontend URL configured correctly
- [ ] Password reset endpoints implemented
- [ ] Email templates created
- [ ] Rate limiting implemented
- [ ] Audit logging configured
- [ ] HTTPS enabled in production
- [ ] Tested complete forgot/reset flow
- [ ] Error messages are user-friendly
- [ ] Token expiration working correctly


