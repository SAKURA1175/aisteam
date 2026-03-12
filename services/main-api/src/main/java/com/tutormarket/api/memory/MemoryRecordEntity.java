package com.tutormarket.api.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "memory_records")
public class MemoryRecordEntity {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "memory_type", nullable = false)
    private MemoryType memoryType;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(nullable = false)
    private double confidence;

    @Column(name = "source_message_id")
    private UUID sourceMessageId;

    @Column(name = "source_conversation_id")
    private UUID sourceConversationId;

    @Column(name = "confirmed_by_user", nullable = false)
    private boolean confirmedByUser;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(UUID teacherId) {
        this.teacherId = teacherId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public MemoryType getMemoryType() {
        return memoryType;
    }

    public void setMemoryType(MemoryType memoryType) {
        this.memoryType = memoryType;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public UUID getSourceMessageId() {
        return sourceMessageId;
    }

    public void setSourceMessageId(UUID sourceMessageId) {
        this.sourceMessageId = sourceMessageId;
    }

    public UUID getSourceConversationId() {
        return sourceConversationId;
    }

    public void setSourceConversationId(UUID sourceConversationId) {
        this.sourceConversationId = sourceConversationId;
    }

    public boolean isConfirmedByUser() {
        return confirmedByUser;
    }

    public void setConfirmedByUser(boolean confirmedByUser) {
        this.confirmedByUser = confirmedByUser;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
