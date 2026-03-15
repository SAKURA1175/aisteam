"use client";

import type {
  AuthResponse,
  ChatMessageItem,
  ChatStreamEvent,
  CitationItem,
  ConversationSummary,
  DesktopAuthCodeResponse,
  DesktopAuthExchangeRequest,
  KnowledgeFileItem,
  MemoryRecordItem,
  PreferenceResponse,
  TeacherDetail,
  TeacherSummary,
  UpdateMemoryRequest,
  WeChatAuthResponse,
  WeChatExchangeRequest,
  WeChatQrConfigResponse
} from "@tutormarket/types";

const API_PREFIX = "/backend";

type RequestOptions = RequestInit & {
  token?: string | null;
};

type StreamCallbackMap = {
  onStart?: (payload: unknown) => void;
  onToken?: (payload: { delta: string }) => void;
  onCitation?: (payload: CitationItem) => void;
  onMessageEnd?: (payload: { responseId?: string; content: string; model?: string; citations: CitationItem[] }) => void;
  onError?: (payload: unknown) => void;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });
  const fallbackResponse = response.clone();

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.message) {
        message = payload.message;
      } else if (payload.error) {
        message = payload.error;
      }
    } catch {
      const text = await fallbackResponse.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getWechatQrConfig(nextPath?: string): Promise<WeChatQrConfigResponse> {
  const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  return apiFetch<WeChatQrConfigResponse>(`/api/v1/auth/wechat/qr-config${suffix}`);
}

export async function exchangeWechatLogin(payload: WeChatExchangeRequest): Promise<WeChatAuthResponse> {
  return apiFetch<WeChatAuthResponse>("/api/v1/auth/wechat/exchange", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });
}

export async function mintDesktopAuthCode(token: string): Promise<DesktopAuthCodeResponse> {
  return apiFetch<DesktopAuthCodeResponse>("/api/v1/auth/desktop/codes", {
    method: "POST",
    token
  });
}

export async function exchangeDesktopAuthCode(payload: DesktopAuthExchangeRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/desktop/exchange", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getTeachers(): Promise<TeacherSummary[]> {
  return apiFetch<TeacherSummary[]>("/api/v1/teachers");
}

export async function getTeacher(teacherId: string): Promise<TeacherDetail> {
  return apiFetch<TeacherDetail>(`/api/v1/teachers/${teacherId}`);
}

export async function getMe(token: string): Promise<AuthResponse["user"]> {
  return apiFetch<AuthResponse["user"]>("/api/v1/me", { token });
}

export async function getPreferences(token: string): Promise<PreferenceResponse> {
  return apiFetch<PreferenceResponse>("/api/v1/me/preferences", { token });
}

export async function updatePreferences(token: string, payload: PreferenceResponse): Promise<PreferenceResponse> {
  return apiFetch<PreferenceResponse>("/api/v1/me/preferences", {
    method: "PUT",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listUserKnowledgeFiles(token: string, teacherId: string): Promise<KnowledgeFileItem[]> {
  return apiFetch<KnowledgeFileItem[]>(`/api/v1/teachers/${teacherId}/knowledge-files`, { token });
}

export async function uploadUserKnowledgeFile(
  token: string,
  teacherId: string,
  file: File
): Promise<KnowledgeFileItem> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<KnowledgeFileItem>(`/api/v1/teachers/${teacherId}/knowledge-files`, {
    method: "POST",
    token,
    body: formData
  });
}

export async function deleteKnowledgeFile(token: string, fileId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/knowledge-files/${fileId}`, {
    method: "DELETE",
    token
  });
}

export async function listMemoryRecords(token: string, teacherId: string): Promise<MemoryRecordItem[]> {
  return apiFetch<MemoryRecordItem[]>(`/api/v1/teachers/${teacherId}/memory-records`, { token });
}

export async function updateMemoryRecord(
  token: string,
  teacherId: string,
  memoryId: string,
  payload: UpdateMemoryRequest
): Promise<MemoryRecordItem> {
  return apiFetch<MemoryRecordItem>(`/api/v1/teachers/${teacherId}/memory-records/${memoryId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteMemoryRecord(token: string, teacherId: string, memoryId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/teachers/${teacherId}/memory-records/${memoryId}`, {
    method: "DELETE",
    token
  });
}

export async function listConversations(token: string): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/api/v1/conversations", { token });
}

export async function createConversation(token: string, teacherId: string, title?: string): Promise<ConversationSummary> {
  return apiFetch<ConversationSummary>(`/api/v1/teachers/${teacherId}/conversations`, {
    method: "POST",
    token,
    body: JSON.stringify(title ? { title } : {})
  });
}

export async function getMessages(token: string, conversationId: string): Promise<ChatMessageItem[]> {
  return apiFetch<ChatMessageItem[]>(`/api/v1/conversations/${conversationId}/messages`, { token });
}

export async function streamConversationMessage(
  token: string,
  conversationId: string,
  content: string,
  callbacks: StreamCallbackMap
): Promise<void> {
  const response = await fetch(`${API_PREFIX}/api/v1/conversations/${conversationId}/messages:stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });
  const fallbackResponse = response.clone();

  if (!response.ok || !response.body) {
    let message = `Stream failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message = payload.message ?? payload.error ?? message;
    } catch {
      const text = await fallbackResponse.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      dispatchEvent(rawEvent, callbacks);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    dispatchEvent(buffer, callbacks);
  }
}

function dispatchEvent(rawEvent: string, callbacks: StreamCallbackMap) {
  const lines = rawEvent.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  const rawData = dataLines.join("\n");
  const parsedData = parseEventData(rawData);
  const event: ChatStreamEvent = {
    event: eventName as ChatStreamEvent["event"],
    data: parsedData
  };

  switch (event.event) {
    case "message_start":
      callbacks.onStart?.(event.data);
      break;
    case "token":
      callbacks.onToken?.(event.data as { delta: string });
      break;
    case "citation":
      callbacks.onCitation?.(event.data as CitationItem);
      break;
    case "message_end":
      callbacks.onMessageEnd?.(
        event.data as { responseId?: string; content: string; model?: string; citations: CitationItem[] }
      );
      break;
    case "error":
      callbacks.onError?.(event.data);
      break;
    default:
      break;
  }
}

function parseEventData(rawData: string): unknown {
  if (!rawData) {
    return {};
  }

  try {
    return JSON.parse(rawData);
  } catch {
    return rawData;
  }
}
