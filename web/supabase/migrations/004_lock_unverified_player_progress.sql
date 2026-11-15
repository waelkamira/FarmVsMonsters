-- Farm Vs Monsters: lock player progress writes until trusted server-side game results exist.
-- Apply after 003_plant_catalog_and_purchases.sql.
--
-- IMPORTANT: legacy coin balances and progression are retained but marked
-- unverified. Neither can be imported into a device or used for purchases until
-- a trusted server-side completion pipeline explicitly verifies them.

alter table public.player_progress
  add column if not exists coins_verified boolean not null default false,
  add column if not exists progress_verified boolean not null default false;

drop policy if exists "Players can insert their own progress" on public.player_progress;
drop policy if exists "Players can update their own progress" on public.player_progress;

revoke insert, update on public.player_progress from anon, authenticated;
grant select on public.player_progress to authenticated;

-- The client may no longer create or overwrite cloud progression or currency.
-- Trusted SECURITY DEFINER functions (for example, approved purchases) remain
-- the only supported write path.
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
  v_coins_verified boolean;
  v_progress_verified boolean;
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

  select coins, unlocked_stage, coins_verified, progress_verified
    into v_coins, v_unlocked_stage, v_coins_verified, v_progress_verified
  from public.player_progress
  where user_id = v_user_id
  for update;

  if not v_progress_verified then
    raise exception 'PLAYER_PROGRESS_NOT_VERIFIED';
  end if;

  if not v_coins_verified then
    raise exception 'COIN_BALANCE_NOT_VERIFIED';
  end if;

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
