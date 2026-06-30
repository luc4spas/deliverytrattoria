
-- Roles enum + tabela
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- Settings (singleton)
create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meu Restaurante',
  logo_url text,
  primary_color text not null default '#dc2626',
  whatsapp text not null default '5511999999999',
  address text,
  delivery_fee numeric(10,2) not null default 0,
  min_order numeric(10,2) not null default 0,
  is_open boolean not null default true,
  pix_key text,
  opening_hours jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.restaurant_settings enable row level security;

create policy "anyone can view settings" on public.restaurant_settings for select using (true);
create policy "admins manage settings" on public.restaurant_settings for all
  to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

create policy "anyone can view categories" on public.categories for select using (true);
create policy "admins manage categories" on public.categories for all
  to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;

create policy "anyone can view products" on public.products for select using (true);
create policy "admins manage products" on public.products for all
  to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Orders
create type public.order_status as enum ('new','preparing','out_for_delivery','done','cancelled');
create type public.order_type as enum ('delivery','pickup');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  type public.order_type not null default 'delivery',
  address jsonb,
  payment_method text not null,
  change_for numeric(10,2),
  notes text,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status public.order_status not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create policy "anyone can create order" on public.orders for insert with check (true);
create policy "admins view orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
insert into storage.buckets (id, name, public) values ('menu-images','menu-images', true)
on conflict (id) do nothing;

create policy "public read menu images" on storage.objects for select using (bucket_id = 'menu-images');
create policy "admins upload menu images" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));
create policy "admins update menu images" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));
create policy "admins delete menu images" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));

-- Singleton settings row
insert into public.restaurant_settings (name) values ('Meu Restaurante');
