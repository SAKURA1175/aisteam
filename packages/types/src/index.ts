export type UserRole = "STUDENT" | "ADMIN";
export type MessageRole = "USER" | "ASSISTANT";
export type KnowledgeFileStatus = "UPLOADED" | "PARSING" | "INDEXING" | "READY" | "FAILED";
export type KnowledgeFileScope = "TEACHER_PUBLIC" | "USER_PRIVATE";
export type CitationSourceType = "teacher_knowledge" | "student_private";
export type MemoryType = "PROFILE" | "GOAL" | "PREFERENCE" | "PROGRESS" | "ERROR_PATTERN";
export type MemoryRecordSourceType = "memory";

export interface TeacherRuleSnapshot {
  versionId: string;
  title: string;
  systemPrompt: string;
}

export interface MemoryRecordSnapshot {
  id: string;
  memoryType: MemoryType;
  content: string;
  confirmedByUser: boolean;
}

export interface MemoryRecordItem {
  id: string;
  teacherId: string;
  userId: string;
  sourceType: MemoryRecordSourceType | string;
  memoryType: MemoryType;
  content: string;
  confidence: number;
  sourceMessageId: string | null;
  sourceConversationId: string | null;
  confirmedByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMemoryRequest {
  content?: string;
  confirmedByUser?: boolean;
}

export interface AuthUserProfile {
  id: string;
  email: string | null;
  displayName: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUserProfile;
}

export interface WeChatQrConfigResponse {
  appId: string;
  redirectUri: string;
  scope: string;
  state: string;
}

export interface WeChatExchangeRequest {
  code: string;
  state: string;
}

export interface WeChatAuthResponse extends AuthResponse {
  nextPath: string;
}

export type DesktopAuthPlatform = "desktop_win";

export interface DesktopAuthCodeResponse {
  code: string;
  expiresAt: string;
}

export interface DesktopAuthExchangeRequest {
  code: string;
  platform: DesktopAuthPlatform;
}

export interface PreferenceResponse {
  preferredLanguage: string;
  responseStyle: string;
  correctionMode: string;
}

export interface KnowledgeFileItem {
  id: string;
  teacherId: string;
  userId: string | null;
  scope: KnowledgeFileScope;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: KnowledgeFileStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSummary {
  id: string;
  slug: string;
  name: string;
  headline: string;
  tags: string[];
}

export interface TeacherDetail extends TeacherSummary {
  description: string;
  activeRule: TeacherRuleSnapshot | null;
}

export interface ConversationSummary {
  id: string;
  teacherId: string;
  title: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface TeacherCardViewModel {
  id: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  tags: string[];
  accent: string;
  ctaHref: string;
  ctaLabel: string;
}

export interface CitationItem {
  fileId: string;
  fileName: string;
  chunkRef: string;
  snippet: string;
  sourceType: CitationSourceType;
}

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  content: string;
  citations: CitationItem[];
  createdAt: string;
}

export interface ChatRequest {
  conversationId: string;
  teacherId: string;
  userId: string;
  requestId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  teacherRule: TeacherRuleSnapshot;
  preferredLanguage: string;
  responseStyle: string;
  correctionMode: string;
  memoryRecords?: MemoryRecordSnapshot[];
  vectorStoreIds?: string[];
}

export interface ChatStreamEvent<T = unknown> {
  event: "message_start" | "token" | "citation" | "message_end" | "error";
  data: T;
}

export interface TeacherShowcase {
  id: string;
  name: string;
  slug: string;
  title: string;
  domain: string;
  description: string;
  tone: string;
  languages: string[];
  tags: string[];
  outcomes: string[];
  accent: string;
  responseTime: string;
  memoryScope: string;
}

export interface TeacherCitationPreview {
  title: string;
  excerpt: string;
  sourceType: "teacher_knowledge" | "student_private" | "memory";
}

export interface TeacherMemorySignal {
  label: string;
  value: string;
  freshness: string;
}

export interface TeacherConversationPreview {
  id: string;
  role: "user" | "assistant";
  speaker: string;
  content: string;
  citations?: TeacherCitationPreview[];
}

export interface ProductCapability {
  title: string;
  body: string;
  metric: string;
}
