-- MesaFlow - Row Level Security (corrigido)
-- Execute APÓS 001_schema.sql

-- ──────────────────────────────────────────
-- Helper functions (schema public, não auth)
-- ──────────────────────────────────────────
create or replace function public.my_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ──────────────────────────────────────────
-- Enable RLS
-- ──────────────────────────────────────────
alter table public.tenants           enable row level security;
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.cash_registers    enable row level security;
alter table public.cash_transactions enable row level security;

-- ──────────────────────────────────────────
-- TENANTS
-- ──────────────────────────────────────────
create policy "tenant_select" on public.tenants
  for select using (id = public.my_tenant_id() or active = true);

create policy "tenant_update_admin" on public.tenants
  for update using (id = public.my_tenant_id() and public.my_role() = 'admin');

-- ──────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────
create policy "profiles_select" on public.profiles
  for select using (tenant_id = public.my_tenant_id());

create policy "profiles_insert_admin" on public.profiles
  for insert with check (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

create policy "profiles_update_admin" on public.profiles
  for update using (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_delete_admin" on public.profiles
  for delete using (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

-- ──────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────
create policy "categories_select_tenant" on public.categories
  for select using (tenant_id = public.my_tenant_id() or active = true);

create policy "categories_manage_admin" on public.categories
  for all using (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

-- ──────────────────────────────────────────
-- PRODUCTS
-- ──────────────────────────────────────────
create policy "products_select_tenant" on public.products
  for select using (tenant_id = public.my_tenant_id() or available = true);

create policy "products_manage_admin" on public.products
  for all using (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

-- ──────────────────────────────────────────
-- RESTAURANT TABLES
-- ──────────────────────────────────────────
create policy "tables_select" on public.restaurant_tables
  for select using (tenant_id = public.my_tenant_id());

create policy "tables_manage" on public.restaurant_tables
  for all using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','waiter'));

-- ──────────────────────────────────────────
-- ORDERS
-- ──────────────────────────────────────────
create policy "orders_select" on public.orders
  for select using (tenant_id = public.my_tenant_id());

create policy "orders_insert" on public.orders
  for insert with check (tenant_id = public.my_tenant_id());

create policy "orders_update" on public.orders
  for update using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','waiter','cashier','kitchen','bar'));

create policy "orders_delete_admin" on public.orders
  for delete using (tenant_id = public.my_tenant_id() and public.my_role() = 'admin');

-- ──────────────────────────────────────────
-- ORDER ITEMS
-- ──────────────────────────────────────────
create policy "items_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id and o.tenant_id = public.my_tenant_id())
  );

create policy "items_manage" on public.order_items
  for all using (
    exists (select 1 from public.orders o
            where o.id = order_id and o.tenant_id = public.my_tenant_id())
  );

-- ──────────────────────────────────────────
-- CASH REGISTERS
-- ──────────────────────────────────────────
create policy "registers_select" on public.cash_registers
  for select using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','cashier'));

create policy "registers_manage" on public.cash_registers
  for all using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','cashier'));

-- ──────────────────────────────────────────
-- CASH TRANSACTIONS
-- ──────────────────────────────────────────
create policy "transactions_select" on public.cash_transactions
  for select using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','cashier'));

create policy "transactions_manage" on public.cash_transactions
  for all using (tenant_id = public.my_tenant_id()
    and public.my_role() in ('admin','cashier'));

-- ──────────────────────────────────────────
-- Storage bucket para imagens de produtos
-- ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

create policy "product_images_select" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product_images_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
