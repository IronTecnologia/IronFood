-- Tabela de adicionais por categoria
create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  description text,
  price       decimal(10,2) not null default 0 check (price >= 0),
  available   boolean default true,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- Coluna para armazenar adicionais selecionados em cada item do pedido
alter table public.order_items
  add column if not exists addons jsonb default '[]';
