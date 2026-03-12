package com.tutormarket.api.childprofile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChildProfileRepository extends JpaRepository<ChildProfileEntity, UUID> {

    Optional<ChildProfileEntity> findByTenantIdAndUserId(UUID tenantId, UUID userId);
}
