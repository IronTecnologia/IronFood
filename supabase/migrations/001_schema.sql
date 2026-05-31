-- MesaFlow - Schema Principal
-- Execute no SQL Editor do Supabase

-- ──────────────────────────────────────────
-- TENANTS (empresas)
-- ──────────────────────────────────────────
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  type        text not null default 'restaurant'
                check (type in ('restaurant','burger','pizzeria','bar')),
  logo_url    text,
  address     text,
  phone       text,
  email       text,
  plan        text default 'free'
                check (plan in ('free','starter','pro','enterprise')),
  settings    jsonb default '{}',
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ──────────────────────────────────────────
-- PROFILES (extenção de auth.users)
-- ──────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'waiter'
                check (role in ('admin','waiter','kitchen','bar','cashier')),
  avatar_url  text,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ──────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  description text,
  icon        text default '🍽️',
  color       text default '#6366f1',
  sort_order  integer default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────
-- PRODUCTS
-- ──────────────────────────────────────────
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null,
  description      text,
  price            decimal(10,2) not null check (price >= 0),
  image_url        text,
  available        boolean default true,
  product_type     text default 'food'
                     check (product_type in ('food','beverage','combo','other')),
  preparation_time integer default 15,
  sort_order       integer default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ──────────────────────────────────────────
-- RESTAURANT TABLES (mesas)
-- ──────────────────────────────────────────
create table if not exists public.restaurant_tables (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  number      text not null,
  capacity    integer default 4,
  status      text default 'available'
                check (status in ('available','occupied','reserved','cleaning')),
  position_x  integer default 0,
  position_y  integer default 0,
  shape       text default 'square'
                check (shape in ('square','round','rectangle')),
  section     text default 'Salão',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────
-- ORDERS
-- ──────────────────────────────────────────
create sequence if not exists public.order_seq;

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  table_id         uuid references public.restaurant_tables(id) on delete set null,
  user_id          uuid references public.profiles(id) on delete set null,
  order_number     text,
  order_type       text not null
                     check (order_type in ('dine_in','delivery','takeout')),
  status           text default 'pending'
                     check (status in ('pending','confirmed','preparing','ready','delivered','paid','cancelled')),
  customer_name    text,
  customer_phone   text,
  delivery_address text,
  notes            text,
  subtotal         decimal(10,2) default 0,
  discount         decimal(10,2) default 0,
  tax              decimal(10,2) default 0,
  total            decimal(10,2) default 0,
  payment_method   text
                     check (payment_method in ('cash','credit_card','debit_card','pix','other')),
  paid_amount      decimal(10,2),
  change_amount    decimal(10,2),
  paid_at          timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- auto order_number
create or replace function public.set_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null then
    new.order_number := lpad(nextval('public.order_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_number on public.orders;
create trigger trg_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ──────────────────────────────────────────
-- ORDER ITEMS
-- ──────────────────────────────────────────
create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text not null,
  quantity         integer not null check (quantity > 0),
  unit_price       decimal(10,2) not null,
  total_price      decimal(10,2) not null,
  notes            text,
  status           text default 'pending'
                     check (status in ('pending','preparing','ready','delivered','cancelled')),
  sent_to_station  boolean default false,
  station          text default 'kitchen' check (station in ('kitchen','bar')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- recalcula totais do pedido
create or replace function public.recalc_order_total()
returns trigger language plpgsql as $$
begin
  update public.orders
  set
    subtotal   = (select coalesce(sum(total_price),0) from public.order_items
                  where order_id = coalesce(new.order_id, old.order_id)
                    and status != 'cancelled'),
    total      = (select coalesce(sum(total_price),0) from public.order_items
                  where order_id = coalesce(new.order_id, old.order_id)
                    and status != 'cancelled')
                - coalesce((select discount from public.orders
                            where id = coalesce(new.order_id, old.order_id)), 0),
    updated_at = now()
  where id = coalesce(new.order_id, old.order_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalc_total on public.order_items;
create trigger trg_recalc_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_total();

-- ──────────────────────────────────────────
-- CASH REGISTERS (caixa)
-- ──────────────────────────────────────────
create table if not exists public.cash_registers (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  opened_by           uuid references public.profiles(id) on delete set null,
  closed_by           uuid references public.profiles(id) on delete set null,
  opening_balance     decimal(10,2) default 0 not null,
  closing_balance     decimal(10,2),
  expected_balance    decimal(10,2),
  total_sales         decimal(10,2) default 0,
  total_sangrias      decimal(10,2) default 0,
  total_suprimentos   decimal(10,2) default 0,
  difference          decimal(10,2),
  status              text default 'open' check (status in ('open','closed')),
  opened_at           timestamptz default now(),
  closed_at           timestamptz,
  notes               text
);

-- ──────────────────────────────────────────
-- CASH TRANSACTIONS
-- ──────────────────────────────────────────
create table if not exists public.cash_transactions (
  id               uuid primary key default gen_random_uuid(),
  register_id      uuid not null references public.cash_registers(id) on delete cascade,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  transaction_type text not null
                     check (transaction_type in ('sale','sangria','suprimento','adjustment')),
  amount           decimal(10,2) not null,
  description      text,
  order_id         uuid references public.orders(id) on delete set null,
  user_id          uuid references public.profiles(id) on delete set null,
  payment_method   text,
  created_at       timestamptz default now()
);

-- ──────────────────────────────────────────
-- UPDATED_AT triggers
-- ──────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tenants_updated_at   before update on public.tenants   for each row execute function public.touch_updated_at();
create trigger trg_profiles_updated_at  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger trg_products_updated_at  before update on public.products  for each row execute function public.touch_updated_at();
create trigger trg_orders_updated_at    before update on public.orders    for each row execute function public.touch_updated_at();
create trigger trg_items_updated_at     before update on public.order_items for each row execute function public.touch_updated_at();
