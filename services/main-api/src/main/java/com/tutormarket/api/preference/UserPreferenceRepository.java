package com.tutormarket.api.preference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserPreferenceRepository extends JpaRepository<UserPreferenceEntity, UUID> {

    Optional<UserPreferenceEntity> findByUserId(UUID userId);
}
