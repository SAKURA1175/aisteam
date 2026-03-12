alter table knowledge_files
  add column user_id uuid;

alter table knowledge_files
  add constraint fk_knowledge_files_user foreign key (user_id) references users (id);

create index idx_knowledge_tenant_teacher_user
  on knowledge_files (tenant_id, teacher_id, user_id, created_at desc);

create table user_knowledge_stores (
  id uuid primary key,
  tenant_id uuid not null,
  teacher_id uuid not null,
  user_id uuid not null,
  openai_vector_store_id varchar(128) not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_user_knowledge_stores_teacher foreign key (teacher_id) references teachers (id) on delete cascade,
  constraint fk_user_knowledge_stores_user foreign key (user_id) references users (id) on delete cascade
);

create unique index uk_user_knowledge_store_scope
  on user_knowledge_stores (tenant_id, teacher_id, user_id);
