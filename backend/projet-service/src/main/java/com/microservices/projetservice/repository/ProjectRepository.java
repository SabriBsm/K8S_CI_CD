package com.microservices.projetservice.repository;



import com.microservices.projetservice.entity.Project;
//import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.enums.ProjectVisibility;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByStatus(ProjectStatus status);

    List<Project> findByCreatedBy(String createdBy);

    Optional<Project> findByName(String name);

    boolean existsByName(String name);

    @Query("SELECT p FROM Project p WHERE p.progress < 100 AND p.endDate < CURRENT_DATE")
    List<Project> findDelayedProjects();

    @Query("SELECT AVG(p.progress) FROM Project p")
    Double getAverageProgress();

    /**
     * Find projects where user is project manager
     */
    List<Project> findByProjectManagerId(String projectManagerId);

    /**
     * Find projects where user is a member (including as creator)
     */
    @Query("SELECT DISTINCT p FROM Project p WHERE p.createdBy = ?1 OR p.projectManagerId = ?1 OR EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project.id = p.id AND (pm.userId = ?1 OR pm.userId = ?2) AND pm.isActive = true)")
    List<Project> findAllProjectsByUserId(String userId, String resolvedUserId);
}