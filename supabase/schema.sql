-- 1. Profiles Table (Linked to Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  theme_preference text default 'dark',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Characters Table
create table characters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  mode text not null, -- freedom, friendly, professional, custom
  development_state text,
  profile_json jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Chats Table
create table chats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  character_id uuid references characters(id) on delete set null,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Messages Table
create table messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references chats(id) on delete cascade,
  role text not null, -- 'user' or 'ai'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS) so users only see their own data
alter table profiles enable row level security;
alter table characters enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;
