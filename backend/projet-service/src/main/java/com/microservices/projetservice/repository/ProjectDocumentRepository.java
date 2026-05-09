package com.microservices.projetservice.repository;

import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.enums.ProjectDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;

@Repository
public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {

    List<ProjectDocument> findByProjectId(Long projectId);

    List<ProjectDocument> findByProjectIdIn(Collection<Long> projectIds);

    List<ProjectDocument> findByType(ProjectDocumentType type);

    List<ProjectDocument> findByUploadedBy(String uploadedBy);
}
