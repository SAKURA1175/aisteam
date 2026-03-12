package com.tutormarket.api.teacher;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherRuleVersionRepository extends JpaRepository<TeacherRuleVersionEntity, UUID> {

    List<TeacherRuleVersionEntity> findByTeacherIdOrderByVersionNoDesc(UUID teacherId);

    Optional<TeacherRuleVersionEntity> findByTeacherIdAndActiveTrue(UUID teacherId);

    int countByTeacherId(UUID teacherId);
}
