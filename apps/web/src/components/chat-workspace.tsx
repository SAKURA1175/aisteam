"use client";

import type { ChatMessageItem, CitationItem, ConversationSummary, PreferenceResponse } from "@tutormarket/types";
import Image from "next/image";
import { BookOpenText, ChevronDown, ImageIcon, Menu, Mic, Paperclip, SendHorizontal, Settings2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createConversation, getMessages, streamConversationMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getCompanionIdentity } from "../lib/companion-identity";
import { useWorkspace } from "./workspace-shell";

const citationSourceLabel = {
  teacher_knowledge: "伙伴知识库",
  student_private: "家庭资料库"
} as const;

type StarterPrompt = {
  label: string;
  title: string;
  hint: string;
  prompt: string;
};

function hashString(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getDailyTip(displayName: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const tips = [
    `先从一句“${displayName} 你好”开始，让孩子把注意力拉回来。`,
    "每次只做 5-10 分钟，小小进步更容易坚持。",
    "孩子走神没关系，先夸一句，再继续下一步。",
    "把问题变成选择题：想听故事，还是想玩词语？",
    "如果情绪低落，先做安抚，再做学习。"
  ];

  return tips[hashString(`${todayKey}:${displayName}`) % tips.length] ?? tips[0];
}

function formatMessageTimestamp(dateString: string) {
  return new Date(dateString).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatConversationTimestamp(dateString: string) {
  return new Date(dateString).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function CuteCompanionIcon({ src, alt, glyph, className = "" }: { src: string; alt: string; glyph: string; className?: string }) {
  return (
    <div className={`cute-companion-icon ${className}`.trim()}>
      <Image alt={alt} className="cute-companion-icon__image" height={40} src={src} width={40} />
      <span className="cute-companion-icon__fallback" aria-hidden="true">
        {glyph}
      </span>
    </div>
  );
}

export function ChatWorkspace() {
  const router = useRouter();
  const { session, token } = useAuth();
  const {
    activeConversationId,
    beginNewConversation,
    conversationsLoading,
    preferences,
    refreshConversations,
    registerConversation,
    savePreferences,
    savingPreferences,
    selectConversation,
    selectedTeacher,
    selectedTeacherId,
    setSelectedTeacherId,
    teacherConversations,
    teacherDetail,
    teacherDetailLoading,
    teachers,
    teachersLoading,
    workspaceError
  } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companionsMenuOpen, setCompanionsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [preferenceDraft, setPreferenceDraft] = useState<PreferenceResponse>({
    preferredLanguage: "zh-CN",
    responseStyle: "balanced",
    correctionMode: "gentle"
  });
  const [isDesktop, setIsDesktop] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const companion = getCompanionIdentity(selectedTeacher?.slug ?? teacherDetail?.slug);
  const dailyTip = useMemo(() => getDailyTip(companion.displayName), [companion.displayName]);
  const sidebarVisible = isDesktop || sidebarOpen;
  const headerRuleTitle = teacherDetail?.activeRule?.title ?? "蛋壳伴学基础规则 v1";

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (preferences) {
      setPreferenceDraft(preferences);
    }
  }, [preferences]);

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
    if (!messagesViewportRef.current) {
      return;
    }

    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [loadingMessages, messages, streaming]);

  const starterPrompts = useMemo<StarterPrompt[]>(() => {
    if (!selectedTeacher) {
      return [
        {
          label: "共读热身",
          title: "5 分钟绘本开场",
          hint: "先轻松开口",
          prompt: "先和孩子做一个 5 分钟的绘本热身，用轻松提问带他进入状态。"
        },
        {
          label: "表达练习",
          title: "3 个小问题",
          hint: "鼓励孩子多说",
          prompt: "围绕今天的故事内容，设计 3 个适合孩子表达的小问题。"
        },
        {
          label: "睡前安抚",
          title: "安静的小故事",
          hint: "柔和陪伴节奏",
          prompt: "现在是睡前，陪孩子聊一段安静温柔的小故事，不要太兴奋。"
        },
        {
          label: "复习引导",
          title: "从上次继续",
          hint: "先复习再推进",
          prompt: "结合孩子最近一次对话，先复习再推进一点新内容。"
        }
      ];
    }

    return [
      {
        label: "共读热身",
        title: "轻松开场",
        hint: companion.badge,
        prompt: `请以 ${companion.displayName} 的风格，先根据孩子现在的情况安排一个轻松开场。`
      },
      {
        label: "互动练习",
        title: "10 分钟小游戏",
        hint: "10 分钟可完成",
        prompt: `围绕「${companion.subtitle}」，设计一个 10 分钟的互动练习。`
      },
      {
        label: "睡前陪伴",
        title: "慢一点，轻一点",
        hint: "节奏慢一点",
        prompt: `请以 ${companion.displayName} 的语气，做一段适合睡前的安静陪伴对话。`
      },
      {
        label: "复习推进",
        title: "复习再前进",
        hint: "从上次继续",
        prompt: `继续孩子和 ${companion.displayName} 上次的节奏，先复习再推进一点新内容。`
      }
    ];
  }, [companion.badge, companion.displayName, companion.subtitle, selectedTeacher]);

  const hasPreferenceChanges =
    Boolean(preferences) &&
    (preferences?.preferredLanguage !== preferenceDraft.preferredLanguage ||
      preferences?.responseStyle !== preferenceDraft.responseStyle ||
      preferences?.correctionMode !== preferenceDraft.correctionMode);

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
        const createdConversation: ConversationSummary = await createConversation(token, selectedTeacher.id);
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

  async function handlePreferenceSave() {
    try {
      await savePreferences(preferenceDraft);
      setSettingsNotice("陪伴偏好已保存，新的回答会按这个节奏生成。");
      setSettingsError(null);
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : "偏好保存失败");
      setSettingsNotice(null);
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
      {!isDesktop ? (
        <button
          aria-label="关闭侧边栏"
          className={`gemini-overlay${sidebarOpen ? " gemini-overlay--visible" : ""}`}
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`gemini-sidebar${sidebarVisible ? " gemini-sidebar--open" : ""}`}>
        <div className="gemini-sidebar__header">
          <div className="gemini-sidebar__brand">
            <div className="gemini-sidebar__brand-badge">蛋</div>
            <div>
              <strong>蛋壳伴学</strong>
              <span>{companion.displayName} · {companion.subtitle}</span>
            </div>
          </div>
          <button className="gemini-sidebar__new-chat" type="button" onClick={beginNewConversation}>
            <Sparkles size={16} strokeWidth={2.2} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="gemini-sidebar__content">
          <div className="gemini-sidebar__companion">
            <div className="gemini-sidebar__companion-avatar">
              <CuteCompanionIcon
                alt={`${companion.displayName} 图标`}
                className="gemini-sidebar__companion-icon"
                glyph={companion.glyph}
                src={companion.imagePath}
              />
            </div>
            <div>
              <strong>{companion.displayName}</strong>
              <span>{companion.subtitle}</span>
            </div>
          </div>

          <div className="gemini-sidebar__section-title">Recent History</div>
          {conversationsLoading ? (
            <div className="status-panel">正在同步会话...</div>
          ) : teacherConversations.length ? (
            teacherConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`gemini-history-item${activeConversationId === conversation.id ? " gemini-history-item--active" : ""}`}
                type="button"
                onClick={() => {
                  selectConversation(conversation.id);
                  setSidebarOpen(false);
                }}
              >
                <strong>{conversation.title}</strong>
                <span>{formatConversationTimestamp(conversation.updatedAt)}</span>
              </button>
            ))
          ) : (
            <div className="status-panel">当前伙伴下还没有历史会话，先发起第一轮陪伴吧。</div>
          )}

          <div className="gemini-sidebar__section-title">Tools</div>
          <button
            className={`gemini-history-item gemini-history-item--utility${companionsMenuOpen ? " gemini-history-item--utility-open" : ""}`}
            type="button"
            onClick={() => setCompanionsMenuOpen((current) => !current)}
          >
            <Sparkles size={18} strokeWidth={2.1} />
            <span>切换小伙伴</span>
            <ChevronDown className={`gemini-history-item__chevron${companionsMenuOpen ? " gemini-history-item__chevron--open" : ""}`} size={16} strokeWidth={2.2} />
          </button>
          {companionsMenuOpen ? (
            teachersLoading ? (
              <div className="status-panel">正在加载伙伴列表...</div>
            ) : (
              <div className="gemini-companion-switcher">
                {teachers.map((teacher) => {
                  const optionCompanion = getCompanionIdentity(teacher.slug);

                  return (
                    <button
                      key={teacher.id}
                      className={`gemini-companion-option${selectedTeacherId === teacher.id ? " gemini-companion-option--active" : ""}`}
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(teacher.id);
                        setCompanionsMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="gemini-companion-option__avatar">
                        <CuteCompanionIcon
                          alt={`${optionCompanion.displayName} 图标`}
                          className="gemini-companion-option__icon"
                          glyph={optionCompanion.glyph}
                          src={optionCompanion.imagePath}
                        />
                      </div>
                      <div className="gemini-companion-option__copy">
                        <strong>{optionCompanion.displayName}</strong>
                        <span>{optionCompanion.subtitle}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : null}
          <button className="gemini-history-item gemini-history-item--utility" type="button" onClick={() => router.push("/chat/library")}>
            <BookOpenText size={18} strokeWidth={2.1} />
            <span>知识库</span>
          </button>
        </div>
      </aside>

      <div className="gemini-chat-container" style={isDesktop ? { marginLeft: 280 } : undefined}>
        <header className="gemini-chat-header">
          {!isDesktop ? (
            <button className="gemini-menu-btn" type="button" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} strokeWidth={2.2} />
            </button>
          ) : null}

          <div className="gemini-chat-header__companion">
            <div className="gemini-chat-header__avatar">
              <CuteCompanionIcon
                alt={`${companion.displayName} 图标`}
                className="gemini-chat-header__avatar-icon"
                glyph={companion.glyph}
                src={companion.imagePath}
              />
            </div>
            <div className="gemini-chat-header__copy">
              <strong>{companion.displayName}</strong>
              <span>{companion.subtitle}</span>
            </div>
          </div>

          <div className="gemini-chat-header__actions">
            <div className="gemini-status-indicator">
              <span className="gemini-status-dot" />
              <span>{teacherDetailLoading ? "同步伙伴资料中" : headerRuleTitle}</span>
            </div>
            <button
              className="gemini-menu-btn"
              type="button"
              onClick={() => {
                if (preferences) {
                  setPreferenceDraft(preferences);
                }
                setSettingsNotice(null);
                setSettingsError(null);
                setSettingsOpen(true);
              }}
            >
              <Settings2 size={20} strokeWidth={2.1} />
            </button>
          </div>
        </header>

        <div ref={messagesViewportRef} className="gemini-chat-messages">
          <div className="gemini-messages-inner">
            {workspaceError ? (
              <div className="status-panel status-panel--error">
                <strong>工作台数据同步异常</strong>
                <p>{workspaceError}</p>
              </div>
            ) : null}

            {error ? (
              <div className="status-panel status-panel--error">
                <strong>当前对话链路异常</strong>
                <p>{error}</p>
              </div>
            ) : null}

            {loadingMessages ? (
              <div className="status-panel">正在加载会话消息...</div>
            ) : messages.length ? (
              messages.map((message, index) => {
                const isAssistant = message.role === "ASSISTANT";
                const isStreamingAssistant = streaming && isAssistant && index === messages.length - 1;

                return (
                  <article key={message.id} className={`gemini-message${!isAssistant ? " gemini-message--user" : ""}`}>
                    <div className="gemini-message__avatar">
                      {isAssistant ? (
                        <CuteCompanionIcon
                          alt={`${companion.displayName} 图标`}
                          className="gemini-message__avatar-icon"
                          glyph={companion.glyph}
                          src={companion.imagePath}
                        />
                      ) : (
                        <div className="gemini-message__user-avatar">{session?.user.displayName?.slice(0, 1) ?? "你"}</div>
                      )}
                    </div>

                    <div className="gemini-message__content">
                      <div className="gemini-message__bubble">
                        {isStreamingAssistant ? (
                          <div className="chat-message__status">
                            <span>{companion.displayName} 正在想</span>
                            <span className="typing-dots" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          </div>
                        ) : null}
                        <p>{message.content || (isStreamingAssistant ? "正在组织回答..." : "")}</p>
                      </div>

                      <div className="gemini-message__meta">
                        <span>{isAssistant ? companion.displayName : "你"}</span>
                        <span>{formatMessageTimestamp(message.createdAt)}</span>
                      </div>

                      {isAssistant && message.citations.length ? (
                        <>
                          <div className="gemini-message__toolbar">
                            <button
                              className="gemini-message__tool-btn"
                              type="button"
                              onClick={() => toggleCitations(message.id)}
                            >
                              {expandedCitations[message.id] ? "收起依据" : `查看依据 (${message.citations.length})`}
                            </button>
                          </div>
                          {expandedCitations[message.id] ? (
                            <div className="gemini-message__citations">
                              {message.citations.map(renderCitation)}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-stage">
                <div className="empty-stage__mascot">
                  <CuteCompanionIcon
                    alt={`${companion.displayName} 图标`}
                    className="empty-stage__mascot-icon"
                    glyph={companion.glyph}
                    src={companion.imagePath}
                  />
                </div>
                <div className="empty-stage__copy">
                  <span className="empty-stage__eyebrow">今天想从哪里开始？</span>
                  <strong>{companion.displayName} 已经准备好啦</strong>
                  <p>直接和 {companion.displayName} 开始一轮轻松对话，系统会自动带入家庭偏好和后续引用来源。</p>
                  <p className="empty-stage__tip">今日小提示：{dailyTip}</p>
                </div>

                <div className="starter-grid">
                  {starterPrompts.map((prompt) => (
                    <button key={prompt.prompt} className="starter-card" type="button" onClick={() => setDraft(prompt.prompt)}>
                      <span className="starter-card__label">{prompt.label}</span>
                      <strong>{prompt.title}</strong>
                      <span className="starter-card__hint">{prompt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="gemini-input-container" style={isDesktop ? { left: 280 } : undefined}>
          <div className="gemini-input-wrapper">
            <div className="gemini-input-box">
              <button className="gemini-input__icon-btn" disabled={true} type="button" aria-label="上传附件即将支持">
                <Paperclip size={20} strokeWidth={2.1} />
              </button>
              <button className="gemini-input__icon-btn" disabled={true} type="button" aria-label="发送图片即将支持">
                <ImageIcon size={20} strokeWidth={2.1} />
              </button>
              <button className="gemini-input__icon-btn" disabled={true} type="button" aria-label="语音输入即将支持">
                <Mic size={20} strokeWidth={2.1} />
              </button>

              <textarea
                className="gemini-input__field"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask Eggshell anything..."
                rows={1}
              />

              <button className="gemini-send-btn" disabled={!draft.trim() || streaming} type="button" onClick={() => void handleSend()}>
                <SendHorizontal size={20} strokeWidth={2.4} />
              </button>
            </div>
            <p className="gemini-input-caption">Eggshell Learning • Nurturing growth one step at a time</p>
          </div>
        </div>
      </div>

      {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal-panel modal-panel--chat-settings" onClick={(event) => event.stopPropagation()}>
            <div className="modal-panel__header">
              <div className="modal-panel__title-block">
                <h2 className="modal-panel__title">选择伙伴回答偏好</h2>
              </div>
              <button className="modal-text-button" type="button" onClick={() => setSettingsOpen(false)}>
                关闭
              </button>
            </div>

            <div className="preference-grid">
              <label className="form-field">
                <span>回答语言</span>
                <select
                  value={preferenceDraft.preferredLanguage}
                  onChange={(event) =>
                    setPreferenceDraft((current) => ({ ...current, preferredLanguage: event.target.value }))
                  }
                >
                  <option value="zh-CN">中文优先</option>
                  <option value="en-US">英文优先</option>
                  <option value="bilingual">中英双语</option>
                </select>
              </label>

              <label className="form-field">
                <span>回答风格</span>
                <select
                  value={preferenceDraft.responseStyle}
                  onChange={(event) =>
                    setPreferenceDraft((current) => ({ ...current, responseStyle: event.target.value }))
                  }
                >
                  <option value="balanced">平衡讲解</option>
                  <option value="concise">先给结论</option>
                  <option value="coach">追问引导</option>
                </select>
              </label>

              <label className="form-field">
                <span>纠错力度</span>
                <select
                  value={preferenceDraft.correctionMode}
                  onChange={(event) =>
                    setPreferenceDraft((current) => ({ ...current, correctionMode: event.target.value }))
                  }
                >
                  <option value="gentle">温柔提醒</option>
                  <option value="balanced">平衡纠错</option>
                  <option value="strict">严格指出</option>
                </select>
              </label>
            </div>

            {settingsNotice ? <div className="status-panel status-panel--success">{settingsNotice}</div> : null}
            {settingsError ? <div className="status-panel status-panel--error">{settingsError}</div> : null}

            <div className="modal-panel__actions">
              <button
                className="modal-action-button modal-action-button--ghost"
                disabled={!preferences}
                type="button"
                onClick={() => {
                  if (preferences) {
                    setPreferenceDraft(preferences);
                  }
                  setSettingsNotice(null);
                  setSettingsError(null);
                }}
              >
                重置
              </button>
              <button
                className="modal-action-button modal-action-button--primary"
                disabled={!preferences || !hasPreferenceChanges || savingPreferences}
                type="button"
                onClick={() => void handlePreferenceSave()}
              >
                {savingPreferences ? "保存中..." : "保存偏好"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
