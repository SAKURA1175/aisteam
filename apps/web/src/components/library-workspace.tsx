"use client";

import type { KnowledgeFileItem } from "@tutormarket/types";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteKnowledgeFile, listUserKnowledgeFiles, uploadUserKnowledgeFile } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getTeacherBranding } from "../lib/teacher-branding";
import { TeacherAvatar } from "./teacher-avatar";
import { useWorkspace } from "./workspace-shell";

const statusLabels: Record<KnowledgeFileItem["status"], string> = {
  UPLOADED: "已上传",
  PARSING: "解析中",
  INDEXING: "索引中",
  READY: "可检索",
  FAILED: "处理失败"
};

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryWorkspace() {
  const { token } = useAuth();
  const { selectedTeacher, teacherDetail } = useWorkspace();
  const [files, setFiles] = useState<KnowledgeFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const branding = getTeacherBranding(selectedTeacher ?? teacherDetail);

  useEffect(() => {
    if (!token || !selectedTeacher) {
      setFiles([]);
      return;
    }

    setLoadingFiles(true);
    void listUserKnowledgeFiles(token, selectedTeacher.id)
      .then((response) => {
        setFiles(response);
        setError(null);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
      })
      .finally(() => {
        setLoadingFiles(false);
      });
  }, [selectedTeacher, token]);

  const statusSummary = useMemo(
    () => ({
      total: files.length,
      ready: files.filter((item) => item.status === "READY").length,
      processing: files.filter((item) => item.status === "UPLOADED" || item.status === "PARSING" || item.status === "INDEXING").length,
      failed: files.filter((item) => item.status === "FAILED").length
    }),
    [files]
  );

  async function handleFilePick(file: File | null) {
    if (!file || !token || !selectedTeacher) {
      return;
    }

    try {
      setUploading(true);
      setNotice(null);
      setError(null);
      const created = await uploadUserKnowledgeFile(token, selectedTeacher.id, file);
      setFiles((current) => [created, ...current]);
      setNotice(`已上传 ${file.name}，后端会继续完成解析和索引。`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(fileId: string) {
    if (!token || !selectedTeacher) {
      return;
    }

    try {
      setRemovingId(fileId);
      setNotice(null);
      setError(null);
      await deleteKnowledgeFile(token, fileId);
      setFiles((current) => current.filter((item) => item.id !== fileId));
      setNotice("资料已删除，后续检索将不再命中该文件。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setRemovingId(null);
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
          <span className="eyebrow">Family Library</span>
          <h1>{selectedTeacher ? `${selectedTeacher.name} 的家庭资料库` : "等待伙伴上下文"}</h1>
          <p>资料会按“当前家庭 + 当前伙伴”隔离。聊天检索时，系统会自动把这些资料合并到当前伙伴的回答来源中。</p>
        </div>
        {selectedTeacher ? <TeacherAvatar name={selectedTeacher.name} slug={selectedTeacher.slug} size="lg" subtitle={selectedTeacher.headline} /> : null}
      </div>

      {error ? (
        <div className="status-panel status-panel--error">
          <strong>资料接口异常</strong>
          <p>{error}</p>
        </div>
      ) : null}
      {notice ? <div className="status-panel status-panel--success">{notice}</div> : null}

      <div className="memory-summary-grid">
        <article className="metric-card">
          <span>文件总数</span>
          <strong>{statusSummary.total}</strong>
          <p>当前伙伴下的家庭资料</p>
        </article>
        <article className="metric-card">
          <span>可检索</span>
          <strong>{statusSummary.ready}</strong>
          <p>聊天里可直接命中的资料数</p>
        </article>
        <article className="metric-card">
          <span>处理中 / 失败</span>
          <strong>
            {statusSummary.processing} / {statusSummary.failed}
          </strong>
          <p>索引状态直接来自真实后端</p>
        </article>
      </div>

      <div className="upload-card">
        <div>
          <span className="eyebrow">Upload Family Materials</span>
          <h2>上传绘本、笔记、课堂资料或词卡</h2>
          <p>上传完成后，后端会继续解析、索引，并在聊天命中时标记为“家庭资料库”来源。</p>
        </div>
        <div className="upload-card__actions">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            onChange={(event) => void handleFilePick(event.target.files?.[0] ?? null)}
          />
          <button className="button button--primary" disabled={!selectedTeacher || uploading} type="button" onClick={() => fileInputRef.current?.click()}>
            {uploading ? "上传中..." : "上传资料"}
          </button>
        </div>
      </div>

      <div className="library-grid">
        {loadingFiles ? (
          <div className="status-panel">正在加载资料列表...</div>
        ) : files.length ? (
          files.map((file) => (
            <article key={file.id} className="library-card">
              <div className="library-card__top">
                <div>
                  <strong>{file.fileName}</strong>
                  <p>
                    {file.contentType} · {formatBytes(file.sizeBytes)}
                  </p>
                </div>
                <span className={`status-chip status-chip--${file.status.toLowerCase()}`}>{statusLabels[file.status]}</span>
              </div>
              <div className="library-card__meta">
                <span>范围：{file.scope === "USER_PRIVATE" ? "家庭资料" : "伙伴公开资料"}</span>
                <span>上传时间：{new Date(file.createdAt).toLocaleString("zh-CN")}</span>
              </div>
              {file.errorMessage ? <div className="status-panel status-panel--error">{file.errorMessage}</div> : null}
              <div className="library-card__actions">
                <button
                  className="button button--danger"
                  disabled={removingId === file.id}
                  type="button"
                  onClick={() => void handleDelete(file.id)}
                >
                  {removingId === file.id ? "删除中..." : "删除资料"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="status-panel">
            <strong>还没有上传家庭资料</strong>
            <p>先上传一份孩子正在使用的资料，后续聊天命中时这里会形成清晰的来源闭环。</p>
          </div>
        )}
      </div>
    </section>
  );
}
