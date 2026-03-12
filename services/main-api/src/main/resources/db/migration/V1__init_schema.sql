create table users (
  id uuid primary key,
  tenant_id uuid not null,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  display_name varchar(255) not null,
  role varchar(32) not null,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table teachers (
  id uuid primary key,
  tenant_id uuid not null,
  slug varchar(100) not null unique,
  name varchar(255) not null,
  headline varchar(255) not null,
  description text not null,
  openai_vector_store_id varchar(128),
  created_at timestamp not null,
  updated_at timestamp not null
);

create table teacher_tags (
  teacher_id uuid not null,
  tag varchar(64) not null,
  primary key (teacher_id, tag),
  constraint fk_teacher_tags_teacher foreign key (teacher_id) references teachers (id) on delete cascade
);

create table teacher_rule_versions (
  id uuid primary key,
  tenant_id uuid not null,
  teacher_id uuid not null,
  version_no integer not null,
  title varchar(255) not null,
  system_prompt text not null,
  active boolean not null default false,
  created_by uuid,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_rule_versions_teacher foreign key (teacher_id) references teachers (id) on delete cascade
);

create unique index uk_rule_teacher_version on teacher_rule_versions (teacher_id, version_no);

create table user_preferences (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid not null unique,
  preferred_language varchar(32) not null,
  response_style varchar(32) not null,
  correction_mode varchar(32) not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_user_preferences_user foreign key (user_id) references users (id) on delete cascade
);

create table conversations (
  id uuid primary key,
  tenant_id uuid not null,
  teacher_id uuid not null,
  user_id uuid not null,
  title varchar(255) not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  last_message_at timestamp not null,
  constraint fk_conversations_teacher foreign key (teacher_id) references teachers (id),
  constraint fk_conversations_user foreign key (user_id) references users (id)
);

create index idx_conversations_user on conversations (user_id, updated_at desc);

create table messages (
  id uuid primary key,
  tenant_id uuid not null,
  conversation_id uuid not null,
  teacher_id uuid not null,
  user_id uuid not null,
  role varchar(32) not null,
  content text not null,
  citations_json text,
  model_name varchar(128),
  openai_response_id varchar(128),
  created_at timestamp not null,
  constraint fk_messages_conversation foreign key (conversation_id) references conversations (id) on delete cascade
);

create index idx_messages_conversation on messages (conversation_id, created_at asc);

create table knowledge_files (
  id uuid primary key,
  tenant_id uuid not null,
  teacher_id uuid not null,
  created_by uuid not null,
  file_name varchar(255) not null,
  content_type varchar(255) not null,
  object_key varchar(255) not null,
  size_bytes bigint not null,
  scope varchar(64) not null,
  status varchar(32) not null,
  openai_file_id varchar(128),
  openai_vector_store_file_id varchar(128),
  metadata_json text,
  error_message text,
  deleted_at timestamp,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_knowledge_files_teacher foreign key (teacher_id) references teachers (id),
  constraint fk_knowledge_files_creator foreign key (created_by) references users (id)
);

create index idx_knowledge_teacher on knowledge_files (teacher_id, created_at desc);

create table audit_logs (
  id uuid primary key,
  tenant_id uuid not null,
  actor_user_id uuid,
  actor_role varchar(32),
  action varchar(128) not null,
  target_type varchar(128) not null,
  target_id varchar(128),
  request_id varchar(128) not null,
  status varchar(32) not null,
  payload_json text,
  created_at timestamp not null
);

create index idx_audit_logs_request_id on audit_logs (request_id);
