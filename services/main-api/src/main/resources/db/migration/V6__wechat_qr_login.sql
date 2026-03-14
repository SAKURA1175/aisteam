alter table users alter column email drop not null;
alter table users add column wechat_open_id varchar(255);
create unique index uk_users_wechat_open_id on users (wechat_open_id);

create table auth_identities (
  id uuid primary key,
  user_id uuid not null,
  provider varchar(64) not null,
  provider_subject varchar(255) not null,
  wechat_open_id varchar(255),
  wechat_union_id varchar(255),
  created_at timestamp not null,
  updated_at timestamp not null,
  constraint fk_auth_identities_user foreign key (user_id) references users (id) on delete cascade
);

create unique index uk_auth_identities_provider_subject
  on auth_identities (provider, provider_subject);

create unique index uk_auth_identities_wechat_open_id
  on auth_identities (wechat_open_id);

create unique index uk_auth_identities_wechat_union_id
  on auth_identities (wechat_union_id);

insert into auth_identities (
  id,
  user_id,
  provider,
  provider_subject,
  wechat_open_id,
  wechat_union_id,
  created_at,
  updated_at
)
select
  users.id,
  users.id,
  'WECHAT_OPEN',
  users.wechat_open_id,
  users.wechat_open_id,
  null,
  current_timestamp,
  current_timestamp
from users
where users.wechat_open_id is not null
  and not exists (
    select 1
    from auth_identities
    where auth_identities.provider = 'WECHAT_OPEN'
      and auth_identities.provider_subject = users.wechat_open_id
  );
