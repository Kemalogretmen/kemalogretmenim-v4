-- ==========================================================
-- Kemal Ogretmenim - Dokumanlar / PDF ve Gorsel Sistemi
-- Supabase SQL Editor icinde calistirin.
-- Bu script:
-- 1. dokumanlar tablosunu olusturur
-- 2. public dokuman bucket'ini kurar
-- 3. anonim goruntuleme + yonetici yonetimi icin RLS ekler
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.dokumanlar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  sinif integer not null check (sinif between 1 and 8),
  ders text not null,
  hedefler jsonb not null default '[]'::jsonb,
  dosya_yolu text not null,
  dosya_adi text not null,
  dosya_boyutu bigint not null default 0,
  dosya_kaynak_turu text not null default 'supabase' check (dosya_kaynak_turu in ('supabase', 'external', 'video')),
  harici_url text,
  harici_provider text,
  harici_embed_url text,
  sayfa_sayisi integer not null default 0,
  icerik_turu text not null default 'document' check (icerik_turu in ('document', 'video')),
  video_url text,
  video_embed_url text,
  video_provider text,
  video_html text,
  kapak_renk text not null default '#6C3DED',
  etkilesim_json jsonb not null default '{}'::jsonb,
  siralama integer not null default 0,
  aktif boolean not null default true,
  gizli boolean not null default false,
  oturum_gerekli boolean not null default false,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.dokumanlar
  add column if not exists aciklama text,
  add column if not exists sinif integer,
  add column if not exists ders text,
  add column if not exists hedefler jsonb not null default '[]'::jsonb,
  add column if not exists dosya_yolu text,
  add column if not exists dosya_adi text,
  add column if not exists dosya_boyutu bigint not null default 0,
  add column if not exists dosya_kaynak_turu text not null default 'supabase',
  add column if not exists harici_url text,
  add column if not exists harici_provider text,
  add column if not exists harici_embed_url text,
  add column if not exists sayfa_sayisi integer not null default 0,
  add column if not exists icerik_turu text not null default 'document',
  add column if not exists video_url text,
  add column if not exists video_embed_url text,
  add column if not exists video_provider text,
  add column if not exists video_html text,
  add column if not exists kapak_renk text not null default '#6C3DED',
  add column if not exists etkilesim_json jsonb not null default '{}'::jsonb,
  add column if not exists siralama integer not null default 0,
  add column if not exists aktif boolean not null default true,
  add column if not exists gizli boolean not null default false,
  add column if not exists oturum_gerekli boolean not null default false,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

update public.dokumanlar
set guncelleme_tarihi = coalesce(guncelleme_tarihi, olusturma_tarihi, now())
where guncelleme_tarihi is null;

update public.dokumanlar
set dosya_kaynak_turu = case
  when icerik_turu = 'video' then 'video'
  when dosya_yolu ~* '^https?://' then 'external'
  else 'supabase'
end
where dosya_kaynak_turu is null
   or dosya_kaynak_turu not in ('supabase', 'external', 'video');

update public.dokumanlar
set hedefler = jsonb_build_array(jsonb_build_object('sinif', sinif, 'ders', ders))
where (hedefler is null or hedefler = '[]'::jsonb)
  and sinif is not null
  and ders is not null;

alter table public.dokumanlar alter column sinif set not null;
alter table public.dokumanlar alter column ders set not null;
alter table public.dokumanlar alter column dosya_yolu set not null;
alter table public.dokumanlar alter column dosya_adi set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dokumanlar_icerik_turu_check'
      and conrelid = 'public.dokumanlar'::regclass
  ) then
    alter table public.dokumanlar
      add constraint dokumanlar_icerik_turu_check
      check (icerik_turu in ('document', 'video'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dokumanlar_dosya_kaynak_turu_check'
      and conrelid = 'public.dokumanlar'::regclass
  ) then
    alter table public.dokumanlar
      add constraint dokumanlar_dosya_kaynak_turu_check
      check (dosya_kaynak_turu in ('supabase', 'external', 'video'));
  end if;
end $$;

alter table public.dokumanlar enable row level security;

drop policy if exists "dokumanlar public read active" on public.dokumanlar;
create policy "dokumanlar public read active"
on public.dokumanlar
for select
using (aktif = true);

drop policy if exists "dokumanlar auth manage" on public.dokumanlar;
drop policy if exists "dokumanlar auth read all" on public.dokumanlar;
create policy "dokumanlar auth read all"
on public.dokumanlar
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'dokuman_ekleme',
    'dokuman_duzenleme',
    'dokuman_silme'
  ])
);

drop policy if exists "dokumanlar auth insert" on public.dokumanlar;
create policy "dokumanlar auth insert"
on public.dokumanlar
for insert
to authenticated
with check (public.current_admin_has_permission('dokuman_ekleme'));

drop policy if exists "dokumanlar auth update" on public.dokumanlar;
create policy "dokumanlar auth update"
on public.dokumanlar
for update
to authenticated
using (public.current_admin_has_permission('dokuman_duzenleme'))
with check (public.current_admin_has_permission('dokuman_duzenleme'));

drop policy if exists "dokumanlar auth delete" on public.dokumanlar;
create policy "dokumanlar auth delete"
on public.dokumanlar
for delete
to authenticated
using (public.current_admin_has_permission('dokuman_silme'));

create index if not exists idx_dokumanlar_grade_subject_active
  on public.dokumanlar (sinif, ders, aktif, siralama, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_active_hidden
  on public.dokumanlar (aktif, gizli, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_targets_gin
  on public.dokumanlar using gin (hedefler);

create index if not exists idx_dokumanlar_updated_at
  on public.dokumanlar (guncelleme_tarihi desc);

create index if not exists idx_dokumanlar_type_active
  on public.dokumanlar (icerik_turu, aktif, siralama, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_source_active
  on public.dokumanlar (dosya_kaynak_turu, aktif, olusturma_tarihi desc);

grant select on public.dokumanlar to anon;
grant select, insert, update, delete on public.dokumanlar to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokumanlar',
  'dokumanlar',
  true,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dokuman storage public read" on storage.objects;
create policy "dokuman storage public read"
on storage.objects
for select
using (bucket_id = 'dokumanlar');

drop policy if exists "dokuman storage auth insert" on storage.objects;
create policy "dokuman storage auth insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_ekleme')
);

drop policy if exists "dokuman storage auth update" on storage.objects;
create policy "dokuman storage auth update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
)
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
);

drop policy if exists "dokuman storage auth delete" on storage.objects;
create policy "dokuman storage auth delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_silme')
);

create or replace function public.current_request_can_delete_dokuman()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role(), '') not in ('anon', 'authenticated')
    or public.current_admin_has_permission('dokuman_silme');
$$;

grant execute on function public.current_request_can_delete_dokuman() to anon, authenticated;

-- Dokuman silme islemini tek noktadan ve ayni transaction icinde yapar.
-- Admin paneli bu RPC fonksiyonunu cagirir; boylece tablo kaydi,
-- bagli calisma kagidi/veri izleri ve Supabase Storage dosyasi birlikte temizlenir.
create or replace function public.delete_dokuman_with_cleanup(p_dokuman_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_doc public.dokumanlar%rowtype;
  v_doc_deleted integer := 0;
  v_reactions_deleted integer := 0;
  v_progress_deleted integer := 0;
  v_worksheet_rows_deleted integer := 0;
  v_worksheet_submissions_deleted integer := 0;
  v_homepage_refs_cleared integer := 0;
  v_storage_path text := null;
begin
  if p_dokuman_id is null then
    raise exception 'Dokuman id zorunludur.';
  end if;

  if not public.current_request_can_delete_dokuman() then
    raise exception 'Dokuman silme yetkisi gerekli.';
  end if;

  select *
  into v_doc
  from public.dokumanlar
  where id = p_dokuman_id
  for update;

  if not found then
    return jsonb_build_object(
      'deleted', false,
      'reason', 'not-found',
      'documentId', p_dokuman_id::text
    );
  end if;

  if to_regclass('public.content_reactions') is not null then
    execute $cleanup$
      delete from public.content_reactions
      where content_id = $1
        and content_type in ('document', 'video')
    $cleanup$
    using p_dokuman_id::text;
    get diagnostics v_reactions_deleted = row_count;
  end if;

  if to_regclass('public.user_content_progress') is not null then
    execute $cleanup$
      delete from public.user_content_progress
      where content_id = $1
        and content_type in ('document', 'video')
    $cleanup$
    using p_dokuman_id::text;
    get diagnostics v_progress_deleted = row_count;
  end if;

  if to_regclass('public.homepage_slides') is not null then
    execute $cleanup$
      update public.homepage_slides
      set dokuman_id = null,
          link_url = case
            when link_url = '/dokuman.html?id=' || $1 then null
            else link_url
          end,
          guncelleme_tarihi = now()
      where dokuman_id = $2
         or link_url = '/dokuman.html?id=' || $1
    $cleanup$
    using p_dokuman_id::text, p_dokuman_id;
    get diagnostics v_homepage_refs_cleared = row_count;
  end if;

  if to_regclass('public.calisma_kagidi_gonderimleri') is not null then
    execute 'delete from public.calisma_kagidi_gonderimleri where dokuman_id = $1'
    using p_dokuman_id;
    get diagnostics v_worksheet_submissions_deleted = row_count;
  end if;

  if to_regclass('public.calisma_kagidi_alanlari') is not null
     and to_regclass('public.calisma_kagitlari') is not null then
    execute $cleanup$
      delete from public.calisma_kagidi_alanlari
      where calisma_kagidi_id in (
        select id
        from public.calisma_kagitlari
        where dokuman_id = $1
      )
    $cleanup$
    using p_dokuman_id;
    get diagnostics v_worksheet_rows_deleted = row_count;
  end if;

  if to_regclass('public.calisma_kagitlari') is not null then
    execute 'delete from public.calisma_kagitlari where dokuman_id = $1'
    using p_dokuman_id;
  end if;

  delete from public.dokumanlar
  where id = p_dokuman_id;
  get diagnostics v_doc_deleted = row_count;

  if coalesce(v_doc.dosya_kaynak_turu, 'supabase') = 'supabase'
     and nullif(trim(v_doc.dosya_yolu), '') is not null then
    v_storage_path := v_doc.dosya_yolu;
  end if;

  return jsonb_build_object(
    'deleted', v_doc_deleted > 0,
    'documentId', p_dokuman_id::text,
    'storageDeleted', 0,
    'storagePath', v_storage_path,
    'storageDeleteRequired', v_storage_path is not null,
    'reactionsDeleted', v_reactions_deleted,
    'progressDeleted', v_progress_deleted,
    'worksheetRowsDeleted', v_worksheet_rows_deleted,
    'worksheetSubmissionsDeleted', v_worksheet_submissions_deleted,
    'homepageReferencesCleared', v_homepage_refs_cleared
  );
end;
$$;

grant execute on function public.delete_dokuman_with_cleanup(uuid) to authenticated;

-- Gecmiste ekrandan silinmis ama Storage veya izleme tablolarinda kalmis
-- dokuman artiklarini temizlemek icin bakim fonksiyonu.
-- Once neyi silecegini gormek icin:
--   select * from public.list_orphan_dokuman_storage();
-- Silmek icin:
--   select public.cleanup_deleted_dokuman_artifacts();
create or replace function public.list_orphan_dokuman_storage()
returns table (
  bucket_id text,
  name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not public.current_request_can_delete_dokuman() then
    raise exception 'Dokuman silme yetkisi gerekli.';
  end if;

  if to_regclass('public.homepage_slides') is not null then
    return query execute $query$
      select o.bucket_id, o.name, o.updated_at
      from storage.objects o
      where o.bucket_id = 'dokumanlar'
        and not exists (
          select 1
          from public.dokumanlar d
          where coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
            and d.dosya_yolu = o.name
        )
        and not exists (
          select 1
          from public.homepage_slides h
          where h.media_path = o.name
        )
      order by o.updated_at desc nulls last, o.name
    $query$;
    return;
  end if;

  return query execute $query$
    select o.bucket_id, o.name, o.updated_at
    from storage.objects o
    where o.bucket_id = 'dokumanlar'
      and not exists (
        select 1
        from public.dokumanlar d
        where coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
          and d.dosya_yolu = o.name
      )
    order by o.updated_at desc nulls last, o.name
  $query$;
end;
$$;

grant execute on function public.list_orphan_dokuman_storage() to authenticated;

create or replace function public.cleanup_deleted_dokuman_artifacts()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_orphan_storage_count integer := 0;
  v_reactions_deleted integer := 0;
  v_progress_deleted integer := 0;
begin
  if not public.current_request_can_delete_dokuman() then
    raise exception 'Dokuman silme yetkisi gerekli.';
  end if;

  if to_regclass('public.content_reactions') is not null then
    execute $cleanup$
      delete from public.content_reactions r
      where r.content_type in ('document', 'video')
        and not exists (
          select 1
          from public.dokumanlar d
          where d.id::text = r.content_id
        )
    $cleanup$;
    get diagnostics v_reactions_deleted = row_count;
  end if;

  if to_regclass('public.user_content_progress') is not null then
    execute $cleanup$
      delete from public.user_content_progress p
      where p.content_type in ('document', 'video')
        and not exists (
          select 1
          from public.dokumanlar d
          where d.id::text = p.content_id
        )
    $cleanup$;
    get diagnostics v_progress_deleted = row_count;
  end if;

  if to_regclass('public.homepage_slides') is not null then
    execute $cleanup$
      select count(*)::integer
      from storage.objects o
      where o.bucket_id = 'dokumanlar'
        and not exists (
          select 1
          from public.dokumanlar d
          where coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
            and d.dosya_yolu = o.name
        )
        and not exists (
          select 1
          from public.homepage_slides h
          where h.media_path = o.name
        )
    $cleanup$
    into v_orphan_storage_count;
  else
    execute $cleanup$
      select count(*)::integer
      from storage.objects o
      where o.bucket_id = 'dokumanlar'
        and not exists (
          select 1
          from public.dokumanlar d
          where coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
            and d.dosya_yolu = o.name
        )
    $cleanup$
    into v_orphan_storage_count;
  end if;

  return jsonb_build_object(
    'storageDeleted', 0,
    'orphanStorageCount', v_orphan_storage_count,
    'storageCleanupNote', 'Supabase Storage dosyalari SQL ile dogrudan silinemez. Once list_orphan_dokuman_storage() ile listeleyip Storage API uzerinden silin.',
    'reactionsDeleted', v_reactions_deleted,
    'progressDeleted', v_progress_deleted
  );
end;
$$;

grant execute on function public.cleanup_deleted_dokuman_artifacts() to authenticated;
