-- Kısayol Dock ikonları için bir kez çalıştırın.
-- site_settings tablosu mevcut olduğundan dock bağlantıları aynı kayıt içinde tutulur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

drop policy if exists "site-assets public read" on storage.objects;
create policy "site-assets public read"
on storage.objects for select to public
using (bucket_id = 'site-assets');

drop policy if exists "site-assets admin upload" on storage.objects;
create policy "site-assets admin upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and public.current_admin_has_permission('site_admin_dashboard')
);

drop policy if exists "site-assets admin update" on storage.objects;
create policy "site-assets admin update"
on storage.objects for update to authenticated
using (
  bucket_id = 'site-assets'
  and public.current_admin_has_permission('site_admin_dashboard')
)
with check (
  bucket_id = 'site-assets'
  and public.current_admin_has_permission('site_admin_dashboard')
);

drop policy if exists "site-assets admin delete" on storage.objects;
create policy "site-assets admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-assets'
  and public.current_admin_has_permission('site_admin_dashboard')
);
