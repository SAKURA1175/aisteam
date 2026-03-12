package com.tutormarket.api.feedback;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FeedbackEventRepository extends JpaRepository<FeedbackEventEntity, UUID> {

    List<FeedbackEventEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    List<FeedbackEventEntity> findByTenantIdAndTeacherIdOrderByCreatedAtDesc(UUID tenantId, UUID teacherId, Pageable pageable);
}
