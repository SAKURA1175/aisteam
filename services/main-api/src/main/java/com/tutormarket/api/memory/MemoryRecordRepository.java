package com.tutormarket.api.memory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemoryRecordRepository extends JpaRepository<MemoryRecordEntity, UUID> {

    List<MemoryRecordEntity> findByTenantIdAndTeacherIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
            UUID tenantId,
            UUID teacherId,
            UUID userId
    );

    List<MemoryRecordEntity> findByTenantIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
            UUID tenantId,
            UUID userId
    );

    Optional<MemoryRecordEntity> findByIdAndTenantIdAndTeacherIdAndUserIdAndDeletedAtIsNull(
            UUID id,
            UUID tenantId,
            UUID teacherId,
            UUID userId
    );

    Optional<MemoryRecordEntity> findByTenantIdAndTeacherIdAndUserIdAndMemoryTypeAndContentAndDeletedAtIsNull(
            UUID tenantId,
            UUID teacherId,
            UUID userId,
            MemoryType memoryType,
            String content
    );
}
