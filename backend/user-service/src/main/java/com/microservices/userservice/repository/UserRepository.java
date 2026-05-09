package com.microservices.userservice.repository;

import com.microservices.userservice.entity.User;
import com.microservices.userservice.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByResetToken(String resetToken);

    Boolean existsByEmail(String email);
    
    Boolean existsByUsername(String username);
    
    List<User> findByRole(String role);
    
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.status = 'ACTIVE'")
    List<User> findActiveUsersByRole(@Param("role") String role);
}

