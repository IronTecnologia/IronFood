-- MesaFlow - Dados de Demonstração
-- 1. Crie o usuário admin via Supabase Auth (Dashboard > Authentication > Users)
--    Email: admin@mesaflow.com  Senha: Admin@123
-- 2. Copie o UUID gerado e substitua <USER_UUID> abaixo
-- 3. Execute este script

do $$
declare
  v_tenant_id uuid := gen_random_uuid();
  v_user_id   uuid := '9da28847-8786-4553-829b-30dfab17667a';
  -- Categorias
  c_entradas uuid := gen_random_uuid();
  c_hamburguer uuid := gen_random_uuid();
  c_porcoes uuid := gen_random_uuid();
  c_bebidas uuid := gen_random_uuid();
  c_sobremesas uuid := gen_random_uuid();
begin
  -- Tenant
  insert into public.tenants (id, name, slug, type, phone, email)
  values (v_tenant_id, 'Restaurante MesaFlow', 'mesaflow-demo', 'restaurant',
          '(11) 99999-9999', 'contato@mesaflow.com');

  -- Profile admin
  insert into public.profiles (id, tenant_id, full_name, role)
  values (v_user_id, v_tenant_id, 'Administrador', 'admin');

  -- Categorias
  insert into public.categories (id, tenant_id, name, icon, color, sort_order) values
    (c_entradas,    v_tenant_id, 'Entradas',    '🥗', '#10b981', 1),
    (c_hamburguer,  v_tenant_id, 'Hambúrgueres','🍔', '#f59e0b', 2),
    (c_porcoes,     v_tenant_id, 'Porções',     '🍟', '#ef4444', 3),
    (c_bebidas,     v_tenant_id, 'Bebidas',     '🥤', '#3b82f6', 4),
    (c_sobremesas,  v_tenant_id, 'Sobremesas',  '🍦', '#8b5cf6', 5);

  -- Produtos
  insert into public.products (tenant_id, category_id, name, description, price, product_type, preparation_time) values
    -- Entradas
    (v_tenant_id, c_entradas, 'Bruschetta', 'Pão italiano com tomate e manjericão', 22.90, 'food', 10),
    (v_tenant_id, c_entradas, 'Caldo Verde', 'Sopa cremosa com couve e chouriço', 19.90, 'food', 15),
    -- Hambúrgueres
    (v_tenant_id, c_hamburguer, 'Classic Burger', 'Blend 180g, queijo cheddar, alface, tomate', 38.90, 'food', 20),
    (v_tenant_id, c_hamburguer, 'Bacon Smash', 'Smash 2x120g, bacon crocante, molho especial', 45.90, 'food', 25),
    (v_tenant_id, c_hamburguer, 'Veggie Burger', 'Hambúrguer de grão-de-bico, rúcula, pesto', 34.90, 'food', 20),
    -- Porções
    (v_tenant_id, c_porcoes, 'Batata Frita', 'Porção 300g com maionese defumada', 24.90, 'food', 15),
    (v_tenant_id, c_porcoes, 'Onion Rings', 'Anéis de cebola empanados crocantes', 22.90, 'food', 15),
    (v_tenant_id, c_porcoes, 'Tábua de Frios', 'Salame, presunto, queijos e pão artesanal', 58.90, 'food', 10),
    -- Bebidas
    (v_tenant_id, c_bebidas, 'Coca-Cola Lata', '350ml gelada', 7.90, 'beverage', 1),
    (v_tenant_id, c_bebidas, 'Suco Natural', 'Laranja, morango ou maracujá - 500ml', 14.90, 'beverage', 8),
    (v_tenant_id, c_bebidas, 'Cerveja Heineken', 'Long neck 330ml', 12.90, 'beverage', 1),
    (v_tenant_id, c_bebidas, 'Água Mineral', '500ml com ou sem gás', 5.90, 'beverage', 1),
    (v_tenant_id, c_bebidas, 'Caipirinha', 'Limão, cachaça artesanal', 22.90, 'beverage', 5),
    -- Sobremesas
    (v_tenant_id, c_sobremesas, 'Brownie com Sorvete', 'Brownie quente, sorvete creme, calda chocolate', 22.90, 'food', 10),
    (v_tenant_id, c_sobremesas, 'Pudim', 'Pudim caseiro de leite condensado', 14.90, 'food', 5);

  -- Mesas (layout 4x4)
  insert into public.restaurant_tables (tenant_id, number, capacity, position_x, position_y, shape, section) values
    (v_tenant_id, '01', 2, 0, 0, 'square', 'Salão'),
    (v_tenant_id, '02', 2, 1, 0, 'square', 'Salão'),
    (v_tenant_id, '03', 4, 2, 0, 'round',  'Salão'),
    (v_tenant_id, '04', 4, 3, 0, 'round',  'Salão'),
    (v_tenant_id, '05', 4, 0, 1, 'square', 'Salão'),
    (v_tenant_id, '06', 4, 1, 1, 'square', 'Salão'),
    (v_tenant_id, '07', 6, 2, 1, 'rectangle', 'Salão'),
    (v_tenant_id, '08', 6, 3, 1, 'rectangle', 'Salão'),
    (v_tenant_id, '09', 2, 0, 2, 'square', 'Varanda'),
    (v_tenant_id, '10', 2, 1, 2, 'square', 'Varanda'),
    (v_tenant_id, '11', 4, 2, 2, 'round',  'Varanda'),
    (v_tenant_id, '12', 4, 3, 2, 'round',  'Varanda');

  raise notice 'Seed concluído! Tenant ID: %', v_tenant_id;
end;
$$;
