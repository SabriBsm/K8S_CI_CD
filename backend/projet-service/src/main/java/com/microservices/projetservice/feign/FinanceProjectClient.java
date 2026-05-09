package com.microservices.projetservice.feign;

import com.microservices.projetservice.dto.ProjectDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "finance-service", url = "${finance-service.url:http://localhost:8090}")
public interface FinanceProjectClient {

    @PostMapping("/api/finance/projects/sync")
    void syncProject(
            @RequestHeader("X-PlanSync-Internal-Service") String internalService,
            @RequestBody ProjectDTO projectDTO
    );
}
