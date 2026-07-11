-- ==========================================================
-- Kemal Ogretmenim - dinamik menu public okuma hotfix
-- Tarih: 2026-06-14
--
-- Hata: Menu yonetiminde kayitlar var ama ana site menusunde gorunmuyor.
-- Sebep: Eski public select policy'si anon istekte
-- public.current_admin_has_permission(...) fonksiyonunu da degerlendirebiliyor.
--
-- Supabase SQL Editor icinde calistirin.
-- ==========================================================

drop policy if exists "menu_ogeler public read active" on public.menu_ogeler;
drop policy if exists "menu_ogeler authenticated read active or admin" on public.menu_ogeler;

grant select on public.menu_ogeler to anon, authenticated;

create policy "menu_ogeler public read active"
on public.menu_ogeler
for select
to anon
using (active = true);

create policy "menu_ogeler authenticated read active or admin"
on public.menu_ogeler
for select
to authenticated
using (
  active = true
  or public.current_admin_has_permission('menu_yonetimi')
);

-- Kontrol: anon aktif menu ogelerini okuyabilmeli.
select nav_key, sinif, ders_key, label, active
from public.menu_ogeler
where active = true
order by nav_key, sort_order;
