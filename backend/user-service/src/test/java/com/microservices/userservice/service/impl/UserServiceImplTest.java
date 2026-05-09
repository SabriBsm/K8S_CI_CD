package com.microservices.userservice.service.impl;

import com.microservices.userservice.dto.request.SessionUsageRequestDTO;
import com.microservices.userservice.dto.response.UserResponseDTO;
import com.microservices.userservice.dto.response.analytics.UsageDashboardDTO;
import com.microservices.userservice.entity.User;
import com.microservices.userservice.enums.UserStatus;
import com.microservices.userservice.mapper.UserMapper;
import com.microservices.userservice.repository.UserRepository;
import com.microservices.userservice.service.AvatarStorageService;
import com.microservices.userservice.service.EmailService;
import com.microservices.userservice.service.JwtTokenService;
import com.microservices.userservice.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private AvatarStorageService avatarStorageService;

    @Mock
    private JwtTokenService jwtTokenService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(userService, "frontendUrl", "http://localhost:4200");
    }

    @Test
    void recordSessionUsageShouldAccumulateUsageOnUser() {
        User user = User.builder()
                .id(1L)
                .username("alice")
                .firstName("Alice")
                .lastName("Martin")
                .email("alice@plansync.io")
                .role("ADMIN")
                .status(UserStatus.ACTIVE)
                .totalAppUsageSeconds(60L)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toResponseDTO(any(User.class))).thenAnswer(invocation -> {
            User mapped = invocation.getArgument(0);
            return UserResponseDTO.builder()
                    .id(mapped.getId())
                    .username(mapped.getUsername())
                    .email(mapped.getEmail())
                    .firstName(mapped.getFirstName())
                    .lastName(mapped.getLastName())
                    .role(mapped.getRole())
                    .status(mapped.getStatus() != null ? mapped.getStatus().name() : null)
                    .totalAppUsageSeconds(mapped.getTotalAppUsageSeconds())
                    .build();
        });

        UserResponseDTO response = userService.recordSessionUsage(1L, new SessionUsageRequestDTO(120L));

        assertThat(response.getTotalAppUsageSeconds()).isEqualTo(180L);
    }

    @Test
    void getUsageDashboardShouldRankUsersByTotalUsage() {
        User alice = User.builder()
                .id(1L)
                .username("alice")
                .firstName("Alice")
                .lastName("Martin")
                .email("alice@plansync.io")
                .role("ADMIN")
                .status(UserStatus.ACTIVE)
                .totalAppUsageSeconds(5400L)
                .build();

        User bob = User.builder()
                .id(2L)
                .username("bob")
                .firstName("Bob")
                .lastName("Johnson")
                .email("bob@plansync.io")
                .role("PROJECT_MANAGER")
                .status(UserStatus.ACTIVE)
                .totalAppUsageSeconds(1800L)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(alice, bob));

        UsageDashboardDTO dashboard = userService.getUsageDashboard(null, 10);

        assertThat(dashboard.getScope()).isEqualTo("GLOBAL");
        assertThat(dashboard.getTotalUsers()).isEqualTo(2L);
        assertThat(dashboard.getTotalSeconds()).isEqualTo(7200L);
        assertThat(dashboard.getGlobalRanking().getUsers()).hasSize(2);
        assertThat(dashboard.getTopUser()).isNotNull();
        assertThat(dashboard.getTopUser().getUserId()).isEqualTo(1L);
        assertThat(dashboard.getTopUser().getTotalSeconds()).isEqualTo(5400L);
        assertThat(dashboard.getGlobalRanking().getUsers().get(0).getDisplayName()).isEqualTo("Alice Martin");
        assertThat(dashboard.getGlobalRanking().getUsers().get(0).getTotalMinutes()).isEqualTo(90.0);
        assertThat(dashboard.getGlobalRanking().getUsers().get(0).getTotalHours()).isEqualTo(1.5);
    }
}

