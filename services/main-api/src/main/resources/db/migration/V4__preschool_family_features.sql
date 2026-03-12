create table child_profiles (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid not null unique,
  child_name varchar(100),
  age_years integer,
  interests varchar(255),
  guardian_goal text,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_child_profiles_user foreign key (user_id) references users (id) on delete cascade
);

create index idx_child_profiles_tenant_user
  on child_profiles (tenant_id, user_id);

create table feedback_events (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid not null,
  teacher_id uuid,
  conversation_id uuid,
  message_id uuid,
  kind varchar(32) not null,
  note text,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_feedback_events_user foreign key (user_id) references users (id) on delete cascade,
  constraint fk_feedback_events_teacher foreign key (teacher_id) references teachers (id) on delete set null,
  constraint fk_feedback_events_conversation foreign key (conversation_id) references conversations (id) on delete set null,
  constraint fk_feedback_events_message foreign key (message_id) references messages (id) on delete set null
);

create index idx_feedback_events_tenant_created
  on feedback_events (tenant_id, created_at desc);

create index idx_feedback_events_teacher
  on feedback_events (tenant_id, teacher_id, created_at desc);
