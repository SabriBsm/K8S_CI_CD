package com.microservices.projetservice.repository;

import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.enums.MilestoneStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    List<Milestone> findByProjectId(Long projectId);

    List<Milestone> findByProjectIdIn(Collection<Long> projectIds);

    List<Milestone> findByStatus(MilestoneStatus status);

    List<Milestone> findByIsCritical(Boolean isCritical);

    List<Milestone> findByProjectIdAndStatus(Long projectId, MilestoneStatus status);

    List<Milestone> findByDueDateBefore(LocalDate date);

    List<Milestone> findByDueDateBetween(LocalDate startDate, LocalDate endDate);

    List<Milestone> findByProjectIdAndDueDateBefore(Long projectId, LocalDate date);

    List<Milestone> findByStatusAndDueDateBefore(MilestoneStatus status, LocalDate date);
}
