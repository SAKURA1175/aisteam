"use client";

import type { MemoryRecordItem } from "@tutormarket/types";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { deleteMemoryRecord, listMemoryRecords, updateMemoryRecord } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getTeacherBranding } from "../lib/teacher-branding";
import { TeacherAvatar } from "./teacher-avatar";
import { useWorkspace } from "./workspace-shell";

const memoryTypeLabel: Record<MemoryRecordItem["memoryType"], string> = {
  PROFILE: "孩子画像",
  GOAL: "学习目标",
  PREFERENCE: "偏好线索",
  PROGRESS: "学习进度",
  ERROR_PATTERN: "易错点"
};

export function MemoryWorkspace() {
  const { token } = useAuth();
  const { selectedTeacher, teacherDetail } = useWorkspace();
  const [records, setRecords] = useState<MemoryRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const branding = getTeacherBranding(selectedTeacher ?? teacherDetail);

  useEffect(() => {
    if (!token || !selectedTeacher) {
      setRecords([]);
      return;
    }

    setLoading(true);
    void listMemoryRecords(token, selectedTeacher.id)
      .then((response) => {
        setRecords(response);
        setError(null);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedTeacher, token]);

  const groupedCounts = useMemo(() => {
    return records.reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.memoryType] = (accumulator[record.memoryType] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [records]);

  const primaryMemoryType = useMemo(() => {
    const sorted = Object.entries(groupedCounts).sort((left, right) => right[1] - left[1])[0];
    return sorted ? (sorted[0] as MemoryRecordItem["memoryType"]) : null;
  }, [groupedCounts]);

  function startEditing(record: MemoryRecordItem) {
    setEditingId(record.id);
    setDraftContent(record.content);
    setNotice(null);
    setError(null);
  }

  async function handleSave(record: MemoryRecordItem) {
    if (!token || !selectedTeacher) {
      return;
    }

    try {
      setSavingId(record.id);
      const updated = await updateMemoryRecord(token, selectedTeacher.id, record.id, {
        content: draftContent.trim()
      });
      setRecords((current) => current.map((item) => (item.id === record.id ? updated : item)));
      setEditingId(null);
      setDraftContent("");
      setNotice("记忆内容已更新。");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "记忆保存失败");
      setNotice(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleConfirmToggle(record: MemoryRecordItem) {
    if (!token || !selectedTeacher) {
      return;
    }

    try {
      setSavingId(record.id);
      const updated = await updateMemoryRecord(token, selectedTeacher.id, record.id, {
        confirmedByUser: !record.confirmedByUser
      });
      setRecords((current) => current.map((item) => (item.id === record.id ? updated : item)));
      setNotice(updated.confirmedByUser ? "这条记忆已被标记为已确认。" : "这条记忆已取消确认。");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "记忆更新失败");
      setNotice(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(record: MemoryRecordItem) {
    if (!token || !selectedTeacher) {
      return;
    }

    try {
      setDeletingId(record.id);
      await deleteMemoryRecord(token, selectedTeacher.id, record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setNotice("记忆已删除，后续不会再被当前伙伴调用。");
      setError(null);
      if (editingId === record.id) {
        setEditingId(null);
        setDraftContent("");
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
      setNotice(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="workspace-page">
      <div
        className="workspace-hero"
        style={
          {
            "--teacher-accent": branding.accent,
            "--teacher-surface": branding.surface
          } as CSSProperties
        }
      >
        <div className="workspace-hero__copy">
          <span className="eyebrow">Memory Garden</span>
          <h1>{selectedTeacher ? `${selectedTeacher.name} 的长期记忆` : "等待伙伴上下文"}</h1>
          <p>这里直接接到真实 `memory_records` 接口。你可以查看、确认、修正或删除当前伙伴记住的长期信息。</p>
        </div>
        {selectedTeacher ? <TeacherAvatar name={selectedTeacher.name} slug={selectedTeacher.slug} size="lg" subtitle={selectedTeacher.headline} /> : null}
      </div>

      {error ? (
        <div className="status-panel status-panel--error">
          <strong>记忆接口异常</strong>
          <p>{error}</p>
        </div>
      ) : null}
      {notice ? <div className="status-panel status-panel--success">{notice}</div> : null}

      <div className="memory-summary-grid">
        <article className="metric-card">
          <span>总记忆数</span>
          <strong>{records.length}</strong>
          <p>当前伙伴下的全部长期记忆</p>
        </article>
        <article className="metric-card">
          <span>已确认</span>
          <strong>{records.filter((record) => record.confirmedByUser).length}</strong>
          <p>被家长确认过的记忆条目</p>
        </article>
        <article className="metric-card">
          <span>主要类型</span>
          <strong>{primaryMemoryType ? memoryTypeLabel[primaryMemoryType] : "暂无"}</strong>
          <p>用于快速了解当前长期记忆的重点</p>
        </article>
      </div>

      <div className="memory-grid">
        {loading ? (
          <div className="status-panel">正在拉取真实记忆列表...</div>
        ) : records.length ? (
          records.map((record) => {
            const isEditing = editingId === record.id;
            return (
              <article key={record.id} className="memory-card">
                <div className="memory-card__top">
                  <div>
                    <span className="memory-card__type">{memoryTypeLabel[record.memoryType]}</span>
                    <strong>{record.confirmedByUser ? "已确认记忆" : "待确认记忆"}</strong>
                  </div>
                  <span className="memory-card__confidence">置信度 {Math.round(record.confidence * 100)}%</span>
                </div>

                {isEditing ? (
                  <textarea
                    className="memory-card__editor"
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    rows={4}
                  />
                ) : (
                  <p className="memory-card__content">{record.content}</p>
                )}

                <div className="memory-card__meta">
                  <span>来源：{record.sourceType}</span>
                  <span>更新时间：{new Date(record.updatedAt).toLocaleString("zh-CN")}</span>
                </div>

                <div className="memory-card__actions">
                  {isEditing ? (
                    <>
                      <button className="button button--ghost" type="button" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                      <button
                        className="button button--primary"
                        disabled={!draftContent.trim() || savingId === record.id}
                        type="button"
                        onClick={() => void handleSave(record)}
                      >
                        {savingId === record.id ? "保存中..." : "保存修改"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="button button--ghost" type="button" onClick={() => startEditing(record)}>
                        编辑内容
                      </button>
                      <button
                        className="button button--ghost"
                        disabled={savingId === record.id}
                        type="button"
                        onClick={() => void handleConfirmToggle(record)}
                      >
                        {record.confirmedByUser ? "取消确认" : "确认记忆"}
                      </button>
                      <button
                        className="button button--danger"
                        disabled={deletingId === record.id}
                        type="button"
                        onClick={() => void handleDelete(record)}
                      >
                        {deletingId === record.id ? "删除中..." : "删除"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="status-panel">
            <strong>当前还没有长期记忆</strong>
            <p>先在聊天里进行几轮互动，系统抽取到稳定信息后，这里会自动展示真实记忆记录。</p>
          </div>
        )}
      </div>
    </section>
  );
}
