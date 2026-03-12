"use client";

import type { ChatMessageItem, CitationItem, ConversationSummary } from "@tutormarket/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { createConversation, getMessages, streamConversationMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getCompanionIdentity } from "../lib/companion-identity";
import { getTeacherBranding } from "../lib/teacher-branding";
import { useWorkspace } from "./workspace-shell";

const citationSourceLabel = {
  teacher_knowledge: "伙伴知识库",
  student_private: "家庭资料库"
} as const;

export function ChatWorkspace() {
  const { session, token } = useAuth();
  const {
    activeConversationId,
    beginNewConversation,
    conversationsLoading,
    preferences,
    refreshConversations,
    registerConversation,
    selectedTeacher,
    teacherConversations,
    teacherDetail,
    teacherDetailLoading
  } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const chatStreamRef = useRef<HTMLDivElement | null>(null);
  const branding = getTeacherBranding(selectedTeacher ?? teacherDetail);
  const companion = getCompanionIdentity(selectedTeacher?.slug ?? teacherDetail?.slug);

  useEffect(() => {
    if (!token || !activeConversationId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    void getMessages(token, activeConversationId)
      .then((response) => {
        setMessages(response);
        setError(null);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [activeConversationId, token]);

  useEffect(() => {
    if (!chatStreamRef.current) {
      return;
    }

    chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
  }, [loadingMessages, messages, streaming]);

  const starterPrompts = useMemo(() => {
    if (!selectedTeacher) {
      return [
        { label: "共读热身", hint: "先轻松开口", prompt: "先和孩子做一个 5 分钟的绘本热身，用轻松提问带他进入状态。" },
        { label: "表达练习", hint: "鼓励孩子多说", prompt: "围绕今天的故事内容，设计 3 个适合孩子表达的小问题。" },
        { label: "睡前安抚", hint: "柔和陪伴节奏", prompt: "现在是睡前，陪孩子聊一段安静温柔的小故事，不要太兴奋。" },
        { label: "复习引导", hint: "从上次继续", prompt: "结合孩子最近一次对话，先复习再推进一点新内容。" }
      ];
    }

    return [
      {
        label: "共读热身",
        hint: branding.promptHint,
        prompt: `请以 ${companion.displayName} 的风格，先根据孩子现在的情况安排一个轻松开场。`
      },
      {
        label: "互动练习",
        hint: "10 分钟可完成",
        prompt: `围绕「${companion.subtitle}」，设计一个 10 分钟的互动练习。`
      },
      {
        label: "睡前陪伴",
        hint: "节奏慢一点",
        prompt: `请以 ${companion.displayName} 的语气，做一段适合睡前的安静陪伴对话。`
      },
      {
        label: "复习推进",
        hint: "从上次继续",
        prompt: `继续孩子和 ${companion.displayName} 上次的节奏，先复习再推进一点新内容。`
      }
    ];
  }, [branding.promptHint, companion.displayName, companion.subtitle, selectedTeacher]);

  async function handleSend() {
    if (!token || !session || !selectedTeacher || !draft.trim() || streaming) {
      return;
    }

    setError(null);
    setStreaming(true);

    const content = draft.trim();
    setDraft("");

    let conversationId = activeConversationId;
    const timestamp = new Date().toISOString();
    const optimisticUserId = `local-user-${Date.now()}`;
    const optimisticAssistantId = `local-assistant-${Date.now()}`;
    const optimisticUserMessage: ChatMessageItem = {
      id: optimisticUserId,
      role: "USER",
      content,
      citations: [],
      createdAt: timestamp
    };
    const optimisticAssistantMessage: ChatMessageItem = {
      id: optimisticAssistantId,
      role: "ASSISTANT",
      content: "",
      citations: [],
      createdAt: timestamp
    };

    try {
      if (!conversationId) {
        const createdConversation: ConversationSummary = await createConversation(token, selectedTeacher.id, companion.displayName);
        registerConversation(createdConversation);
        conversationId = createdConversation.id;
      }

      setMessages((current) => [...current, optimisticUserMessage, optimisticAssistantMessage]);

      await streamConversationMessage(token, conversationId, content, {
        onToken: ({ delta }) => {
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "ASSISTANT"
                ? { ...message, content: `${message.content}${delta}` }
                : message
            )
          );
        },
        onCitation: (citation) => {
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "ASSISTANT"
                ? { ...message, citations: [...message.citations, citation] }
                : message
            )
          );
        },
        onMessageEnd: (payload) => {
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "ASSISTANT"
                ? { ...message, content: payload.content, citations: payload.citations ?? [] }
                : message
            )
          );
        },
        onError: (payload) => {
          setError(typeof payload === "string" ? payload : "流式请求失败");
        }
      });

      if (conversationId) {
        const latestMessages = await getMessages(token, conversationId);
        setMessages(latestMessages);
      }
      await refreshConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "发送失败");
      if (conversationId) {
        try {
          const latestMessages = await getMessages(token, conversationId);
          setMessages(latestMessages);
        } catch {
          setMessages((current) =>
            current.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId)
          );
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  function renderCitation(citation: CitationItem, index: number) {
    return (
      <div key={`${citation.fileId}-${citation.chunkRef}-${index}`} className="citation-card">
        <div className="citation-card__meta">
          <span>{citationSourceLabel[citation.sourceType]}</span>
          <strong>{citation.fileName}</strong>
        </div>
        <p>{citation.snippet}</p>
      </div>
    );
  }

  function toggleCitations(messageId: string) {
    setExpandedCitations((current) => ({
      ...current,
      [messageId]: !current[messageId]
    }));
  }

  if (!selectedTeacher) {
    return (
      <section className="workspace-page">
        <div className="status-panel">
          <strong>还没有可用伙伴</strong>
          <p>先确认老师接口已经返回数据，加载成功后这里会自动切到当前伙伴。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <div className="chat-context-bar">
        <div className="chat-context-bar__copy">
          <span className="chat-context-bar__eyebrow">陪伴对话</span>
          <strong>{companion.displayName}</strong>
          <span>{companion.subtitle}</span>
        </div>
        <div className="chat-context-bar__meta">
          <span className="workspace-chip">真实 SSE</span>
          <span className="workspace-chip workspace-chip--soft">
            {conversationsLoading ? "同步会话中" : `${teacherConversations.length} 个历史会话`}
          </span>
          {teacherDetailLoading ? <span className="workspace-chip workspace-chip--soft">同步伙伴资料中</span> : null}
        </div>
      </div>

      {error ? (
        <div className="status-panel status-panel--error">
          <strong>当前对话链路异常</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="chat-layout">
        <div ref={chatStreamRef} className="chat-thread">
          {loadingMessages ? (
            <div className="status-panel">正在加载会话消息...</div>
          ) : messages.length ? (
            messages.map((message) => (
              <article key={message.id} className={`chat-message chat-message--${message.role === "ASSISTANT" ? "assistant" : "user"}`}>
                <div className="chat-message__meta">
                  <span>{message.role === "ASSISTANT" ? companion.displayName : session?.user.displayName ?? "你"}</span>
                  <span>{new Date(message.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="chat-message__content">
                  <p>{message.content || (message.role === "ASSISTANT" && streaming ? "正在组织回答..." : "")}</p>
                </div>
                {message.citations.length ? (
                  <div className="citation-stack">
                    <button
                      className={`chat-sources-toggle${expandedCitations[message.id] ? " chat-sources-toggle--open" : ""}`}
                      type="button"
                      onClick={() => toggleCitations(message.id)}
                    >
                      {expandedCitations[message.id] ? "收起依据" : `查看依据 (${message.citations.length})`}
                    </button>
                    {expandedCitations[message.id] ? (
                      <div className="chat-sources-panel">{message.citations.map(renderCitation)}</div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="empty-stage">
              <div className="empty-stage__copy">
                <span className="empty-stage__eyebrow">今天想从哪里开始？</span>
                <strong>{branding.welcomeTitle}</strong>
                <p>直接和 {companion.displayName} 开始一轮轻松对话，系统会自动带入家庭偏好和后续引用来源。</p>
              </div>
              <div className="starter-grid">
                {starterPrompts.map((prompt) => (
                  <button key={prompt.prompt} className="starter-card" type="button" onClick={() => setDraft(prompt.prompt)}>
                    <span className="starter-card__label">{prompt.label}</span>
                    <strong>{prompt.prompt}</strong>
                    <span className="starter-card__hint">{prompt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="chat-composer-dock">
          <div className="chat-composer-dock__meta">
            <strong>{streaming ? "正在生成回答..." : `发送给 ${companion.displayName}`}</strong>
            <span>
              当前偏好：{preferences?.preferredLanguage ?? "zh-CN"} / {preferences?.responseStyle ?? "balanced"} /{" "}
              {preferences?.correctionMode ?? "gentle"}
            </span>
          </div>
          <div className="composer-card__heading">
            <span className="workspace-chip workspace-chip--soft">Cmd/Ctrl + Enter 发送</span>
          </div>
          <textarea
            className="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="输入想和伙伴继续的话题，例如：请结合孩子上次的记忆，先做一个 10 分钟的轻练习。"
            rows={5}
          />
          <div className="composer-actions">
            <button className="button button--ghost" type="button" onClick={beginNewConversation}>
              新建会话
            </button>
            <button className="button button--ghost" type="button" onClick={() => setDraft(starterPrompts[0]?.prompt ?? "")}>
              填入示例
            </button>
            <button className="button button--primary" disabled={!draft.trim() || streaming} type="button" onClick={() => void handleSend()}>
              {streaming ? "发送中..." : "发送消息"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
