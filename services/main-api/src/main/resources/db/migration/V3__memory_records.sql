create table memory_records (
  id uuid primary key,
  tenant_id uuid not null,
  teacher_id uuid not null,
  user_id uuid not null,
  memory_type varchar(32) not null,
  content text not null,
  confidence double precision not null,
  source_message_id uuid,
  source_conversation_id uuid,
  confirmed_by_user boolean not null default false,
  deleted_at timestamp,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_memory_records_teacher foreign key (teacher_id) references teachers (id) on delete cascade,
  constraint fk_memory_records_user foreign key (user_id) references users (id) on delete cascade
);

create index idx_memory_records_scope
  on memory_records (tenant_id, teacher_id, user_id, updated_at desc);
