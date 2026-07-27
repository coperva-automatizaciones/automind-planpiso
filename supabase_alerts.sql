-- ============================================================
--  Automind · Sistema de Alertas por Cambio de Semáforo
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Reglas de alerta por workspace ───────────────────────
-- Una regla define: para este semáforo, notificar a estos roles
create table if not exists alert_rules (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  semaforo        text not null check (semaforo in ('saludable','rotacion','comprometido','vencer','intereses')),
  notify_vendedor  boolean not null default false,
  notify_gerente   boolean not null default false,
  notify_director  boolean not null default true,
  activa          boolean not null default true,
  created_at      timestamptz default now(),
  unique (workspace_id, semaforo)
);
create index if not exists idx_alert_rules_ws on alert_rules(workspace_id);

-- ── 2. Log de alertas enviadas ───────────────────────────────
create table if not exists alert_log (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references workspaces(id),
  vehicle_id      text,
  vehicle_desc    text,                    -- marca + modelo para el email
  semaforo_from   text,
  semaforo_to     text not null,
  sent_to         text[],                  -- array de emails notificados
  error           text,                    -- si hubo error al enviar
  created_at      timestamptz default now()
);
create index if not exists idx_alert_log_ws  on alert_log(workspace_id);
create index if not exists idx_alert_log_ts  on alert_log(created_at desc);

-- ── 3. RLS ───────────────────────────────────────────────────
alter table alert_rules enable row level security;
alter table alert_log   enable row level security;

create policy "alert_rules_select" on alert_rules for select
  using (workspace_id = any(select my_workspace_ids()));
create policy "alert_rules_insert" on alert_rules for insert
  with check (workspace_id = any(select my_workspace_ids()));
create policy "alert_rules_update" on alert_rules for update
  using (workspace_id = any(select my_workspace_ids()));

create policy "alert_log_select" on alert_log for select
  using (workspace_id = any(select my_workspace_ids()));
create policy "alert_log_insert" on alert_log for insert
  with check (true); -- Edge Function usa service role

-- ── 4. Seed: reglas por defecto para workspaces existentes ───
-- Por defecto: solo alertas críticas notifican al director
insert into alert_rules (workspace_id, semaforo, notify_vendedor, notify_gerente, notify_director, activa)
select
  w.id,
  s.semaforo,
  s.vendedor,
  s.gerente,
  s.director,
  s.activa
from workspaces w
cross join (values
  ('saludable',   false, false, false, false),
  ('rotacion',    false, false, false, true),
  ('comprometido',true,  true,  true,  true),
  ('vencer',      true,  true,  true,  true),
  ('intereses',   true,  true,  true,  true)
) as s(semaforo, vendedor, gerente, director, activa)
on conflict (workspace_id, semaforo) do nothing;

-- ── FIN ──────────────────────────────────────────────────────
-- Reglas por defecto:
--   saludable   → sin alertas
--   rotacion    → sin alertas (solo informativo)
--   comprometido→ vendedor + gerente + director
--   vencer      → vendedor + gerente + director
--   intereses   → vendedor + gerente + director
