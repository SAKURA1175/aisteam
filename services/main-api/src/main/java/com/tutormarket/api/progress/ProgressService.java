package com.tutormarket.api.progress;

import com.tutormarket.api.conversation.ConversationRepository;
import com.tutormarket.api.knowledge.KnowledgeFileRepository;
import com.tutormarket.api.knowledge.KnowledgeFileScope;
import com.tutormarket.api.knowledge.KnowledgeFileStatus;
import com.tutormarket.api.memory.MemoryRecordRepository;
import com.tutormarket.api.security.UserPrincipal;
import com.tutormarket.api.teacher.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class ProgressService {

    private final ConversationRepository conversationRepository;
    private final MemoryRecordRepository memoryRecordRepository;
    private final KnowledgeFileRepository knowledgeFileRepository;
    private final TeacherRepository teacherRepository;

    public ProgressService(ConversationRepository conversationRepository,
                           MemoryRecordRepository memoryRecordRepository,
                           KnowledgeFileRepository knowledgeFileRepository,
                           TeacherRepository teacherRepository) {
        this.conversationRepository = conversationRepository;
        this.memoryRecordRepository = memoryRecordRepository;
        this.knowledgeFileRepository = knowledgeFileRepository;
        this.teacherRepository = teacherRepository;
    }

    @Transactional(readOnly = true)
    public ProgressDtos.ProgressSummaryResponse getSummary(UserPrincipal principal) {
        var conversations = conversationRepository.findByTenantIdAndUserIdOrderByUpdatedAtDesc(principal.tenantId(), principal.userId());
        var memories = memoryRecordRepository.findByTenantIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
                principal.tenantId(),
                principal.userId()
        );
        var familyKnowledgeFiles = knowledgeFileRepository.findByTenantIdAndUserIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
                principal.tenantId(),
                principal.userId(),
                KnowledgeFileScope.USER_PRIVATE
        );
        var teachers = teacherRepository.findAllByTenantIdOrderByCreatedAtAsc(principal.tenantId());
        var teacherNameById = new HashMap<String, String>();
        teachers.forEach(teacher -> teacherNameById.put(teacher.getId().toString(), teacher.getName()));

        Map<String, Long> conversationCountByTeacher = new HashMap<>();
        Map<String, Instant> lastActivityByTeacher = new HashMap<>();
        conversations.forEach(conversation -> {
            var teacherId = conversation.getTeacherId().toString();
            conversationCountByTeacher.merge(teacherId, 1L, Long::sum);
            lastActivityByTeacher.merge(teacherId, conversation.getUpdatedAt(), this::latest);
        });

        Map<String, Long> memoryCountByTeacher = new HashMap<>();
        Map<String, Long> confirmedMemoryCountByTeacher = new HashMap<>();
        memories.forEach(memory -> {
            var teacherId = memory.getTeacherId().toString();
            memoryCountByTeacher.merge(teacherId, 1L, Long::sum);
            if (memory.isConfirmedByUser()) {
                confirmedMemoryCountByTeacher.merge(teacherId, 1L, Long::sum);
            }
            lastActivityByTeacher.merge(teacherId, memory.getUpdatedAt(), this::latest);
        });

        Map<String, Long> familyKnowledgeTotalByTeacher = new HashMap<>();
        Map<String, Long> familyKnowledgeReadyByTeacher = new HashMap<>();
        familyKnowledgeFiles.forEach(file -> {
            var teacherId = file.getTeacherId().toString();
            familyKnowledgeTotalByTeacher.merge(teacherId, 1L, Long::sum);
            if (file.getStatus() == KnowledgeFileStatus.READY) {
                familyKnowledgeReadyByTeacher.merge(teacherId, 1L, Long::sum);
            }
            lastActivityByTeacher.merge(teacherId, file.getUpdatedAt(), this::latest);
        });

        var teacherResponses = teacherNameById.entrySet().stream()
                .filter(entry -> conversationCountByTeacher.containsKey(entry.getKey())
                        || memoryCountByTeacher.containsKey(entry.getKey())
                        || familyKnowledgeTotalByTeacher.containsKey(entry.getKey()))
                .map(entry -> new ProgressDtos.TeacherProgressResponse(
                        entry.getKey(),
                        entry.getValue(),
                        conversationCountByTeacher.getOrDefault(entry.getKey(), 0L),
                        memoryCountByTeacher.getOrDefault(entry.getKey(), 0L),
                        confirmedMemoryCountByTeacher.getOrDefault(entry.getKey(), 0L),
                        familyKnowledgeTotalByTeacher.getOrDefault(entry.getKey(), 0L),
                        familyKnowledgeReadyByTeacher.getOrDefault(entry.getKey(), 0L),
                        lastActivityByTeacher.get(entry.getKey())
                ))
                .sorted(Comparator.comparing(ProgressDtos.TeacherProgressResponse::lastActivityAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        var lastActivityAt = teacherResponses.stream()
                .map(ProgressDtos.TeacherProgressResponse::lastActivityAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return new ProgressDtos.ProgressSummaryResponse(
                conversations.size(),
                memories.size(),
                familyKnowledgeFiles.size(),
                familyKnowledgeFiles.stream().filter(file -> file.getStatus() == KnowledgeFileStatus.READY).count(),
                lastActivityAt,
                teacherResponses
        );
    }

    private Instant latest(Instant left, Instant right) {
        return left.isAfter(right) ? left : right;
    }
}
