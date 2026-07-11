-- Okuma Karne Merkezi / Okuma Sonuclari goruntuleme hotfix
-- Bu dosya veri silmez. Sadece sonuclar tablosu okuma iznini ve gerekli fonksiyon
-- calistirma izinlerini yeniden kurar.

begin;

alter table public.sonuclar enable row level security;

grant insert on public.sonuclar to anon, authenticated;
grant select, insert, update, delete on public.sonuclar to authenticated;

grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to authenticated;

drop policy if exists "sonuclar auth read" on public.sonuclar;
create policy "sonuclar auth read"
on public.sonuclar
for select
to authenticated
using (
  (select public.current_admin_has_any_permission(array[
    'okuma_sonuclari',
    'okuma_sonuclari_duzenleme',
    'okuma_karne'
  ]))
);

drop policy if exists "sonuclar auth update" on public.sonuclar;
create policy "sonuclar auth update"
on public.sonuclar
for update
to authenticated
using ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')))
with check ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')));

drop policy if exists "sonuclar auth delete" on public.sonuclar;
create policy "sonuclar auth delete"
on public.sonuclar
for delete
to authenticated
using ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')));

commit;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'sonuclar'
order by policyname;
