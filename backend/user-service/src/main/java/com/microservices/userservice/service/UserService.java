package com.microservices.userservice.service;

import com.microservices.userservice.dto.request.ForgotPasswordRequestDTO;
import com.microservices.userservice.dto.request.LoginRequestDTO;
import com.microservices.userservice.dto.request.ResetPasswordRequestDTO;
import com.microservices.userservice.dto.request.ChangePasswordRequestDTO;
import com.microservices.userservice.dto.request.NotifyUserRequestDTO;
import com.microservices.userservice.dto.request.SessionUsageRequestDTO;
import com.microservices.userservice.dto.request.RegisterRequestDTO;
import com.microservices.userservice.dto.request.UserRequestDTO;
import com.microservices.userservice.dto.request.UpdateUserRequestDTO;
import com.microservices.userservice.dto.response.analytics.UsageDashboardDTO;
import com.microservices.userservice.dto.response.AuthResponseDTO;
import com.microservices.userservice.dto.response.UserResponseDTO;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserService {

    AuthResponseDTO login(LoginRequestDTO request);

    AuthResponseDTO register(RegisterRequestDTO request);

    UserResponseDTO createUser(UserRequestDTO request);

    UserResponseDTO updateUser(Long id, UpdateUserRequestDTO request);

    UserResponseDTO getUserById(Long id);

    UserResponseDTO getUserByUsername(String username);

    UserResponseDTO getUserByEmail(String email);

    List<UserResponseDTO> getUsersByRole(String role);

    List<UserResponseDTO> getActiveUsersByRole(String role);

    Page<UserResponseDTO> getAllUsers(Pageable pageable);

    List<UserResponseDTO> getAllUsers();

    void deleteUser(Long id);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    void incrementFailedLoginAttempts(Long userId);

    void resetFailedLoginAttempts(Long userId);

    void changePassword(Long userId, ChangePasswordRequestDTO request);

    void notifyUser(Long userId, NotifyUserRequestDTO request);

    UserResponseDTO uploadAvatar(Long userId, MultipartFile avatar);

    void forgotPassword(ForgotPasswordRequestDTO request);

    void resetPassword(ResetPasswordRequestDTO request);

    UserResponseDTO recordSessionUsage(Long userId, SessionUsageRequestDTO request);

    UsageDashboardDTO getUsageDashboard(String timezone, Integer limit);
}

