-- Farm Vs Monsters: plant catalogue and atomic coin purchases.
-- Apply after 001_player_progress.sql and 002_player_data.sql.

create table if not exists public.stage_one_plant_catalog (
  plant_key text primary key,
  display_name text not null,
  display_name_ar text not null,
  description text not null,
  description_ar text not null,
  role text not null,
  role_ar text not null,
  planting_energy_cost integer not null check (planting_energy_cost >= 0),
  coin_price integer not null default 0 check (coin_price >= 0),
  required_stage integer not null default 1 check (required_stage between 1 and 10),
  is_implemented boolean not null default false,
  is_available boolean not null default false,
  is_purchasable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.stage_one_plant_catalog
  (plant_key, display_name, display_name_ar, description, description_ar, role, role_ar,
   planting_energy_cost, coin_price, required_stage, is_implemented, is_available, is_purchasable)
values
  ('radish','Radish Defender','الفجل المدافع','Rooted lane defender that fires thorns automatically.','مدافع ثابت يطلق الأشواك تلقائياً في مساره.','Lane defender','مدافع المسار',35,0,1,true,true,false),
  ('energy-mushroom','Energy Mushroom','فطر الطاقة','Produces a collectible energy pickup every 12 seconds.','ينتج طاقة قابلة للجمع كل ١٢ ثانية.','Energy producer','منتج للطاقة',50,0,1,true,true,false),
  ('pea-shooter','Pea Shooter','قاذف البازلاء','Rapid single-target seed shooter.','قاذف بذور سريع يستهدف وحشاً واحداً.','Ranged attacker','مهاجم بعيد',65,120,1,false,false,false),
  ('thorn-wall','Thorn Wall','جدار الأشواك','Heavy blocker that damages monsters while bitten.','حاجز صلب يؤذي الوحوش أثناء التهامه.','Heavy blocker','حاجز ثقيل',75,140,1,false,false,false),
  ('sunflower','Sunflower','عباد الشمس','Generates larger energy pickups at slower intervals.','ينتج كميات أكبر من الطاقة على فترات أطول.','Energy generator','مولد للطاقة',55,160,1,false,false,false),
  ('ice-bloom','Ice Bloom','زهرة الصقيع','Launches pollen that temporarily slows a target.','تطلق حبوباً تبطئ الهدف مؤقتاً.','Slowing support','نبتة إبطاء',85,190,1,false,false,false),
  ('double-radish','Twin Radish','الفجل المزدوج','Fires two thorn volleys in quick succession.','يطلق دفعتين من الأشواك بسرعة.','Double attacker','مهاجم مزدوج',95,230,1,false,false,false),
  ('pumpkin-guard','Pumpkin Guard','حارس اليقطين','Armored plant designed to absorb repeated bites.','نبتة مدرعة لامتصاص العضات المتكررة.','Armored blocker','حاجز مدرع',90,250,1,false,false,false),
  ('explosive-berry','Blast Berry','توتة متفجرة','Explodes near monsters and damages a small area.','تنفجر قرب الوحوش وتسبب ضرراً جماعياً.','Area damage','ضرر جماعي',110,300,1,false,false,false),
  ('fire-pepper','Fire Pepper','فلفل النار','Creates a line of fire across its lane.','ينشئ خطاً نارياً على امتداد المسار.','Lane-clearing special','هجوم خاص للمسار',130,360,1,false,false,false)
on conflict (plant_key) do update set
  display_name = excluded.display_name,
  display_name_ar = excluded.display_name_ar,
  description = excluded.description,
  description_ar = excluded.description_ar,
  role = excluded.role,
  role_ar = excluded.role_ar,
  planting_energy_cost = excluded.planting_energy_cost,
  coin_price = excluded.coin_price,
  required_stage = excluded.required_stage,
  is_implemented = excluded.is_implemented,
  is_available = excluded.is_available,
  is_purchasable = excluded.is_purchasable,
  updated_at = now();

alter table public.stage_one_plant_catalog enable row level security;
drop policy if exists "Plant catalogue is readable by everyone" on public.stage_one_plant_catalog;
create policy "Plant catalogue is readable by everyone"
  on public.stage_one_plant_catalog for select
  using (true);
grant select on public.stage_one_plant_catalog to anon, authenticated;

create table if not exists public.player_coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('plant_purchase','game_reward','admin_adjustment')),
  amount integer not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  item_key text,
  created_at timestamptz not null default now()
);

create index if not exists player_coin_transactions_user_created_idx
  on public.player_coin_transactions(user_id, created_at desc);

alter table public.player_coin_transactions enable row level security;
drop policy if exists "Players can read their own coin transactions" on public.player_coin_transactions;
create policy "Players can read their own coin transactions"
  on public.player_coin_transactions for select to authenticated
  using (auth.uid() = user_id);
grant select on public.player_coin_transactions to authenticated;

-- A purchase is performed in one database transaction. Price and availability
-- are read from the server-owned catalogue, never accepted from the client.
create or replace function public.purchase_player_plant(p_plant_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plant public.stage_one_plant_catalog%rowtype;
  v_coins bigint;
  v_unlocked_stage integer;
  v_new_balance bigint;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select * into v_plant
  from public.stage_one_plant_catalog
  where plant_key = p_plant_key;

  if not found or not v_plant.is_available or not v_plant.is_purchasable or not v_plant.is_implemented then
    raise exception 'PLANT_NOT_AVAILABLE_FOR_PURCHASE';
  end if;

  insert into public.player_progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select coins, unlocked_stage into v_coins, v_unlocked_stage
  from public.player_progress
  where user_id = v_user_id
  for update;

  if v_unlocked_stage < v_plant.required_stage then
    raise exception 'PLANT_STAGE_LOCKED';
  end if;

  if exists (
    select 1 from public.player_inventory
    where user_id = v_user_id and item_key = p_plant_key and quantity > 0
  ) then
    raise exception 'PLANT_ALREADY_OWNED';
  end if;

  if v_coins < v_plant.coin_price then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  update public.player_progress
  set coins = coins - v_plant.coin_price, updated_at = now()
  where user_id = v_user_id
  returning coins into v_new_balance;

  insert into public.player_inventory (user_id, item_key, quantity, metadata, updated_at)
  values (v_user_id, p_plant_key, 1, jsonb_build_object('source', 'coin_purchase'), now());

  insert into public.player_coin_transactions
    (user_id, transaction_type, amount, balance_after, item_key)
  values
    (v_user_id, 'plant_purchase', -v_plant.coin_price, v_new_balance, p_plant_key);

  return jsonb_build_object(
    'ok', true,
    'plant_key', p_plant_key,
    'coins', v_new_balance,
    'price', v_plant.coin_price
  );
end;
$$;

revoke all on function public.purchase_player_plant(text) from public;
grant execute on function public.purchase_player_plant(text) to authenticated;
