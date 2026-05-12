package org.example.plansync.Client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "user-service", url = "${user-service.url:http://localhost:8079}")
public interface UserServiceClient {

    @GetMapping("/api/users/all")
    List<UserDTO> getAllUsers();

    @GetMapping("/api/users/{id}")
    UserDTO getUserById(@PathVariable Long id);

    @GetMapping("/api/users/username/{username}")
    UserDTO getUserByUsername(@PathVariable String username);

    @GetMapping("/api/users/email/{email}")
    UserDTO getUserByEmail(@PathVariable String email);
}
