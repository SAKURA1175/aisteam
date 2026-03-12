"use client";

import type { ConversationSummary, PreferenceResponse, TeacherDetail, TeacherSummary } from "@tutormarket/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferences, getTeacher, getTeachers, listConversations, updatePreferences } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getTeacherBranding } from "../lib/teacher-branding";
import { TeacherAvatar } from "./teacher-avatar";

const SELECTED_TEACHER_STORAGE_KEY = "eggshell.selected_teacher_v1";

type WorkspaceKind = "chat" | "memory" | "library";

type WorkspaceContextValue = {
  workspaceKind: WorkspaceKind;
  teachers: TeacherSummary[];
  teachersLoading: boolean;
  workspaceError: string | null;
  selectedTeacher: TeacherSummary | null;
  selectedTeacherId: string | null;
  setSelectedTeacherId: (teacherId: string) => void;
  teacherDetail: TeacherDetail | null;
  teacherDetailLoading: boolean;
  preferences: PreferenceResponse | null;
  savePreferences: (payload: PreferenceResponse) => Promise<void>;
  savingPreferences: boolean;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  teacherConversations: ConversationSummary[];
  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
  selectConversation: (conversationId: string) => void;
  beginNewConversation: () => void;
  registerConversation: (conversation: ConversationSummary) => void;
  refreshConversations: () => Promise<void>;
  goToWorkspace: (kind: WorkspaceKind) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredTeacherId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(SELECTED_TEACHER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildNextPath(pathname: string, queryString: string) {
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function getWorkspaceKind(pathname: string): WorkspaceKind {
  if (pathname.startsWith("/chat/library")) {
    return "library";
  }

  if (pathname.startsWith("/chat/memory")) {
    return "memory";
  }

  return "chat";
}

function getWorkspaceMeta(kind: WorkspaceKind) {
  switch (kind) {
    case "memory":
      return {
        label: "记忆花园",
        description: "查看、确认和修正当前伙伴记住的长期信息"
      };
    case "library":
      return {
        label: "家庭资料库",
        description: "管理当前伙伴可见的家庭素材和成长资料"
      };
    default:
      return {
        label: "陪伴对话",
        description: "进入真实 SSE 对话、引用和会话延续"
      };
  }
}

function resolveTeacherId(teachers: TeacherSummary[], currentTeacherId: string | null, teacherParam: string | null) {
  if (!teachers.length) {
    return null;
  }

  if (teacherParam) {
    const matchedByParam = teachers.find((teacher) => teacher.id === teacherParam || teacher.slug === teacherParam);
    if (matchedByParam) {
      return matchedByParam.id;
    }
  }

  if (currentTeacherId) {
    const matchedByCurrent = teachers.find((teacher) => teacher.id === currentTeacherId);
    if (matchedByCurrent) {
      return matchedByCurrent.id;
    }
  }

  return teachers[0]?.id ?? null;
}

function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [teacherDetailState, setTeacherDetailState] = useState<TeacherDetail | null>(null);
  const [preferences, setPreferences] = useState<PreferenceResponse | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedTeacherId, setSelectedTeacherIdState] = useState<string | null>(() => readStoredTeacherId());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [teacherDetailLoading, setTeacherDetailLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const teacherParam = searchParams.get("teacherId") ?? searchParams.get("teacher");
  const workspaceKind = getWorkspaceKind(pathname);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    void Promise.all([getTeachers(), getPreferences(token), listConversations(token)])
      .then(([teacherResponse, preferenceResponse, conversationResponse]) => {
        if (!active) {
          return;
        }

        setTeachers(teacherResponse);
        setPreferences(preferenceResponse);
        setConversations(conversationResponse);
        setSelectedTeacherIdState((current) => resolveTeacherId(teacherResponse, current, teacherParam));
        setWorkspaceError(null);
        setTeachersLoading(false);
        setConversationsLoading(false);
      })
      .catch((fetchError: Error) => {
        if (!active) {
          return;
        }

        setWorkspaceError(fetchError.message);
        setTeachersLoading(false);
        setConversationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teacherParam, token]);

  useEffect(() => {
    if (!selectedTeacherId) {
      return;
    }

    try {
      window.localStorage.setItem(SELECTED_TEACHER_STORAGE_KEY, selectedTeacherId);
    } catch {
      // Ignore persistence failures and continue with in-memory state.
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    if (!selectedTeacherId) {
      return;
    }

    let active = true;
    setTeacherDetailLoading(true);

    void getTeacher(selectedTeacherId)
      .then((response) => {
        if (!active) {
          return;
        }

        setTeacherDetailState(response);
        setTeacherDetailLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setTeacherDetailState(null);
        setTeacherDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTeacherId]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [selectedTeacherId, teachers]
  );

  const teacherDetail = useMemo(() => {
    if (!selectedTeacherId || !teacherDetailState || teacherDetailState.id !== selectedTeacherId) {
      return null;
    }

    return teacherDetailState;
  }, [selectedTeacherId, teacherDetailState]);

  const teacherConversations = useMemo(
    () => conversations.filter((conversation) => conversation.teacherId === selectedTeacherId),
    [conversations, selectedTeacherId]
  );

  useEffect(() => {
    if (!teacherConversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(teacherConversations[0]?.id ?? null);
    }
  }, [activeConversationId, teacherConversations]);

  const refreshConversations = useCallback(async () => {
    if (!token) {
      return;
    }

    setConversationsLoading(true);

    try {
      const response = await listConversations(token);
      setConversations(response);
      setWorkspaceError(null);
    } catch (refreshError) {
      setWorkspaceError(refreshError instanceof Error ? refreshError.message : "会话刷新失败");
    } finally {
      setConversationsLoading(false);
    }
  }, [token]);

  const savePreferences = useCallback(
    async (payload: PreferenceResponse) => {
      if (!token) {
        return;
      }

      setSavingPreferences(true);

      try {
        const response = await updatePreferences(token, payload);
        setPreferences(response);
        setWorkspaceError(null);
      } catch (saveError) {
        setWorkspaceError(saveError instanceof Error ? saveError.message : "偏好保存失败");
        throw saveError;
      } finally {
        setSavingPreferences(false);
      }
    },
    [token]
  );

  const goToWorkspace = useCallback(
    (kind: WorkspaceKind) => {
      const destination = kind === "chat" ? "/chat" : `/chat/${kind}`;
      router.push(destination);
    },
    [router]
  );

  const beginNewConversation = useCallback(() => {
    setActiveConversationId(null);
    if (pathname !== "/chat") {
      router.push("/chat");
    }
  }, [pathname, router]);

  const selectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      if (pathname !== "/chat") {
        router.push("/chat");
      }
    },
    [pathname, router]
  );

  const registerConversation = useCallback((conversation: ConversationSummary) => {
    setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
    setActiveConversationId(conversation.id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaceKind,
      teachers,
      teachersLoading,
      workspaceError,
      selectedTeacher,
      selectedTeacherId,
      setSelectedTeacherId: setSelectedTeacherIdState,
      teacherDetail,
      teacherDetailLoading,
      preferences,
      savePreferences,
      savingPreferences,
      conversations,
      conversationsLoading,
      teacherConversations,
      activeConversationId,
      setActiveConversationId,
      selectConversation,
      beginNewConversation,
      registerConversation,
      refreshConversations,
      goToWorkspace
    }),
    [
      activeConversationId,
      beginNewConversation,
      conversations,
      conversationsLoading,
      goToWorkspace,
      preferences,
      refreshConversations,
      registerConversation,
      savePreferences,
      savingPreferences,
      selectConversation,
      selectedTeacher,
      selectedTeacherId,
      teacherConversations,
      teacherDetail,
      teacherDetailLoading,
      teachers,
      teachersLoading,
      workspaceError,
      workspaceKind
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

function WorkspaceChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, logout } = useAuth();
  const {
    activeConversationId,
    beginNewConversation,
    conversationsLoading,
    goToWorkspace,
    preferences,
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
    workspaceError,
    workspaceKind
  } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [preferenceDraft, setPreferenceDraft] = useState<PreferenceResponse>({
    preferredLanguage: "zh-CN",
    responseStyle: "balanced",
    correctionMode: "gentle"
  });

  const workspaceMeta = getWorkspaceMeta(workspaceKind);
  const hasPreferenceChanges =
    Boolean(preferences) &&
    (preferences?.preferredLanguage !== preferenceDraft.preferredLanguage ||
      preferences?.responseStyle !== preferenceDraft.responseStyle ||
      preferences?.correctionMode !== preferenceDraft.correctionMode);
  const branding = getTeacherBranding(selectedTeacher ?? teacherDetail);

  function openSettings() {
    if (preferences) {
      setPreferenceDraft(preferences);
    }
    setSettingsNotice(null);
    setSettingsError(null);
    setSettingsOpen(true);
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

  const workspaceItems = [
    { key: "chat", label: "陪伴对话", kind: "chat" as const },
    { key: "memory", label: "记忆花园", kind: "memory" as const },
    { key: "library", label: "家庭资料库", kind: "library" as const }
  ];

  return (
    <div className="workspace-shell">
      {sidebarOpen ? <button className="workspace-overlay" type="button" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`workspace-sidebar${sidebarOpen ? " workspace-sidebar--open" : ""}`}>
        <div className="workspace-brand-card">
          <Link className="brand-lockup brand-lockup--compact" href="/">
            <span className="brand-lockup__symbol">蛋</span>
            <span className="brand-lockup__copy">
              <strong>蛋壳伴学</strong>
              <span>{workspaceMeta.label}</span>
            </span>
          </Link>
          <button className="workspace-close" type="button" onClick={() => setSidebarOpen(false)}>
            关闭
          </button>
        </div>

        <button
          className="button button--primary button--full"
          type="button"
          onClick={() => {
            beginNewConversation();
            setSidebarOpen(false);
          }}
        >
          开启新的陪伴会话
        </button>

        <div className="workspace-section">
          <div className="workspace-section__head">
            <strong>当前伙伴</strong>
            <span>{selectedTeacher?.name ?? "等待老师加载"}</span>
          </div>
          {teachersLoading ? (
            <div className="status-panel">正在加载伙伴列表...</div>
          ) : (
            <div className="workspace-teacher-list">
              {teachers.map((teacher, index) => (
                <button
                  key={teacher.id}
                  className={`workspace-teacher-card${selectedTeacherId === teacher.id ? " workspace-teacher-card--active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedTeacherId(teacher.id);
                    setSidebarOpen(false);
                  }}
                  style={
                    {
                      "--teacher-accent": getTeacherBranding(teacher, index).accent,
                      "--teacher-surface": getTeacherBranding(teacher, index).surface
                    } as CSSProperties
                  }
                >
                  <TeacherAvatar name={teacher.name} slug={teacher.slug} size="sm" subtitle={teacher.headline} />
                  <div className="workspace-teacher-card__copy">
                    <strong>{teacher.name}</strong>
                    <span>{teacher.headline}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-section">
          <div className="workspace-section__head">
            <strong>功能区域</strong>
          </div>
          <div className="workspace-nav">
            {workspaceItems.map((item) => (
              <button
                key={item.key}
                className={`workspace-nav__item${workspaceKind === item.kind ? " workspace-nav__item--active" : ""}`}
                type="button"
                onClick={() => {
                  goToWorkspace(item.kind);
                  setSidebarOpen(false);
                }}
              >
                <strong>{item.label}</strong>
                <span>{getWorkspaceMeta(item.kind).description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="workspace-section workspace-section--grow">
          <div className="workspace-section__head">
            <strong>当前伙伴的历史会话</strong>
            <span>{teacherConversations.length} 个</span>
          </div>
          {conversationsLoading ? (
            <div className="status-panel">正在同步会话...</div>
          ) : teacherConversations.length ? (
            <div className="workspace-conversation-list">
              {teacherConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`workspace-conversation-card${
                    activeConversationId === conversation.id ? " workspace-conversation-card--active" : ""
                  }`}
                  type="button"
                  onClick={() => {
                    selectConversation(conversation.id);
                    setSidebarOpen(false);
                  }}
                >
                  <strong>{conversation.title}</strong>
                  <span>{new Date(conversation.updatedAt).toLocaleString("zh-CN")}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="status-panel">当前伙伴下还没有历史会话，直接开始一轮新的陪伴即可。</div>
          )}
        </div>

        <div className="workspace-account-card">
          <div>
            <strong>{session?.user.displayName}</strong>
            <span>{session?.user.role === "ADMIN" ? "运营账号" : "家庭账号"}</span>
          </div>
          <div className="workspace-account-card__actions">
            <button className="button button--ghost" type="button" onClick={openSettings}>
              偏好设置
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <div className="workspace-frame">
        <header
          className="workspace-topbar"
          style={
            {
              "--teacher-accent": branding.accent,
              "--teacher-surface": branding.surface
            } as CSSProperties
          }
        >
          <button className="workspace-mobile-toggle" type="button" onClick={() => setSidebarOpen(true)}>
            菜单
          </button>
          <div className="workspace-topbar__teacher">
            {selectedTeacher ? (
              <TeacherAvatar name={selectedTeacher.name} slug={selectedTeacher.slug} size="sm" subtitle={selectedTeacher.headline} />
            ) : null}
            <div className="workspace-topbar__copy">
              <span>{workspaceMeta.label}</span>
              <strong>{teacherDetail?.name ?? selectedTeacher?.name ?? "蛋壳伴学"}</strong>
              <p>{teacherDetail?.description ?? workspaceMeta.description}</p>
            </div>
          </div>
          <div className="workspace-topbar__actions">
            {teacherDetailLoading ? <span className="workspace-chip">同步伙伴资料中</span> : null}
            {teacherDetail?.activeRule?.title ? <span className="workspace-chip">{teacherDetail.activeRule.title}</span> : null}
            <button className="button button--ghost" type="button" onClick={openSettings}>
              偏好设置
            </button>
          </div>
        </header>

        {workspaceError ? (
          <div className="workspace-banner">
            <div className="status-panel status-panel--error">
              <strong>工作台数据同步异常</strong>
              <p>{workspaceError}</p>
            </div>
          </div>
        ) : null}

        <div className="workspace-surface">{children}</div>
      </div>

      {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-panel__header">
              <div>
                <span className="eyebrow">Companion Preferences</span>
                <h2>调整家庭陪伴偏好</h2>
              </div>
              <button className="button button--ghost" type="button" onClick={() => setSettingsOpen(false)}>
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
                className="button button--ghost"
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
                className="button button--primary"
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
    </div>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initialized, session, token } = useAuth();
  const nextPath = buildNextPath(pathname, searchParams.toString());

  useEffect(() => {
    if (initialized && (!session || !token)) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [initialized, nextPath, router, session, token]);

  if (!initialized || !session || !token) {
    return (
      <main className="public-page">
        <div className="page-shell">
          <div className="status-panel">
            <strong>正在进入陪伴舱...</strong>
            <p>如果当前浏览器没有有效会话，会自动跳转到登录页。</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceProvider>
      <WorkspaceChrome>{children}</WorkspaceChrome>
    </WorkspaceProvider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceShell");
  }
  return context;
}
