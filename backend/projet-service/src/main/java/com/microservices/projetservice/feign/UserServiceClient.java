package com.microservices.projetservice.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;

@FeignClient(name = "user-service", url = "${user-service.url:http://localhost:8081}")
public interface UserServiceClient {

    /**
     * Get all users by role
     * @param role Role filter (e.g., "CUSTOMER")
     * @return List of DTOs matching the role
     */
    @GetMapping("/api/users/role/{role}")
    List<UserDTO> getUsersByRole(@PathVariable String role);

    /**
     * Get all active users by role
     * @param role Role filter (e.g., "CUSTOMER")
     * @return List of active DTOs matching the role
     */
    @GetMapping("/api/users/role/{role}/active")
    List<UserDTO> getActiveUsersByRole(@PathVariable String role);

    @GetMapping("/api/users/{id}")
    UserDTO getUserById(@PathVariable String id);

    @GetMapping("/api/users/username/{username}")
    UserDTO getUserByUsername(@PathVariable String username);

    @GetMapping("/api/users/email/{email}")
    UserDTO getUserByEmail(@PathVariable String email);
}

