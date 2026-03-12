package com.tutormarket.api.teacher;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.config.AppProperties;
import com.tutormarket.api.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherRuleVersionRepository teacherRuleVersionRepository;
    private final AuditService auditService;
    private final AppProperties appProperties;

    public TeacherService(TeacherRepository teacherRepository,
                          TeacherRuleVersionRepository teacherRuleVersionRepository,
                          AuditService auditService,
                          AppProperties appProperties) {
        this.teacherRepository = teacherRepository;
        this.teacherRuleVersionRepository = teacherRuleVersionRepository;
        this.auditService = auditService;
        this.appProperties = appProperties;
    }

    public List<TeacherDtos.TeacherSummaryResponse> listTeachers() {
        return teacherRepository.findAllByTenantIdOrderByCreatedAtAsc(appProperties.platform().tenantId()).stream()
                .map(this::toSummary)
                .toList();
    }

    public TeacherDtos.TeacherDetailResponse getTeacher(UUID teacherId) {
        var teacher = requireTeacher(teacherId);
        return new TeacherDtos.TeacherDetailResponse(
                teacher.getId().toString(),
                teacher.getSlug(),
                teacher.getName(),
                teacher.getHeadline(),
                teacher.getDescription(),
                teacher.getTags().stream().toList(),
                teacherRuleVersionRepository.findByTeacherIdAndActiveTrue(teacherId).map(this::toRule).orElse(null)
        );
    }

    public TeacherEntity requireTeacher(UUID teacherId) {
        return teacherRepository.findById(teacherId)
                .filter(entity -> entity.getTenantId().equals(appProperties.platform().tenantId()))
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Teacher not found"));
    }

    public TeacherRuleVersionEntity requireActiveRule(UUID teacherId) {
        return teacherRuleVersionRepository.findByTeacherIdAndActiveTrue(teacherId)
                .orElseThrow(() -> new DomainException(HttpStatus.CONFLICT, "Teacher has no active rule version"));
    }

    public List<TeacherDtos.RuleVersionResponse> listRuleVersions(UUID teacherId) {
        requireTeacher(teacherId);
        return teacherRuleVersionRepository.findByTeacherIdOrderByVersionNoDesc(teacherId).stream()
                .map(this::toRule)
                .toList();
    }

    @Transactional
    public TeacherDtos.RuleVersionResponse createRuleVersion(UUID teacherId,
                                                             TeacherDtos.CreateRuleVersionRequest request,
                                                             UserPrincipal actor,
                                                             String requestId) {
        var teacher = requireTeacher(teacherId);
        var entity = new TeacherRuleVersionEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(actor.tenantId());
        entity.setTeacher(teacher);
        entity.setVersionNo(teacherRuleVersionRepository.countByTeacherId(teacherId) + 1);
        entity.setTitle(request.title().trim());
        entity.setSystemPrompt(request.systemPrompt().trim());
        entity.setActive(false);
        entity.setCreatedBy(actor.userId());
        teacherRuleVersionRepository.save(entity);
        auditService.record(actor.tenantId(), actor, "teacher_rules.create_version", "teacher_rule_versions",
                entity.getId().toString(), requestId, "SUCCESS", request);
        return toRule(entity);
    }

    @Transactional
    public TeacherDtos.RuleVersionResponse activateRuleVersion(UUID teacherId,
                                                               UUID versionId,
                                                               UserPrincipal actor,
                                                               String requestId) {
        requireTeacher(teacherId);
        var versions = teacherRuleVersionRepository.findByTeacherIdOrderByVersionNoDesc(teacherId);
        var target = versions.stream()
                .filter(version -> version.getId().equals(versionId))
                .findFirst()
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Rule version not found"));
        versions.forEach(version -> version.setActive(version.getId().equals(versionId)));
        teacherRuleVersionRepository.saveAll(versions);
        auditService.record(actor.tenantId(), actor, "teacher_rules.activate_version", "teacher_rule_versions",
                versionId.toString(), requestId, "SUCCESS", null);
        return toRule(target);
    }

    TeacherDtos.TeacherSummaryResponse toSummary(TeacherEntity entity) {
        return new TeacherDtos.TeacherSummaryResponse(
                entity.getId().toString(),
                entity.getSlug(),
                entity.getName(),
                entity.getHeadline(),
                entity.getTags().stream().toList()
        );
    }

    TeacherDtos.RuleVersionResponse toRule(TeacherRuleVersionEntity entity) {
        return new TeacherDtos.RuleVersionResponse(
                entity.getId().toString(),
                entity.getVersionNo(),
                entity.getTitle(),
                entity.getSystemPrompt(),
                entity.isActive(),
                entity.getCreatedAt()
        );
    }
}
