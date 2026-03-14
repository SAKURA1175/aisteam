"use client";

import type { ConversationSummary, PreferenceResponse, TeacherDetail, TeacherSummary } from "@tutormarket/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferences, getTeacher, getTeachers, listConversations, updatePreferences } from "../lib/api";
import { useAuth } from "../lib/auth";

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
  if (pathname.includes("/memory")) return "memory";
  if (pathname.includes("/library")) return "library";
  return "chat";
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
    // 只有在当前会话ID不为空且不在列表中时，才自动选择第一个会话
    // 这样可以避免在点击"New Chat"清空会话ID后被自动重新选中
    if (activeConversationId && !teacherConversations.some((conversation) => conversation.id === activeConversationId)) {
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
      {children}
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
