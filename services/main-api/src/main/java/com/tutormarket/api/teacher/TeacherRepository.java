package com.tutormarket.api.teacher;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeacherRepository extends JpaRepository<TeacherEntity, UUID> {

    List<TeacherEntity> findAllByTenantIdOrderByCreatedAtAsc(UUID tenantId);
}
