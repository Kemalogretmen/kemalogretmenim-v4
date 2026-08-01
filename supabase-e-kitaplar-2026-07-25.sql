-- ==========================================================
-- Kemal Ogretmenim - E-Kitaplik
-- PDF / coklu gorsel, sorular, sonuclar, begeniler ve yorumlar
-- Supabase SQL Editor icinde tek parca olarak calistirin.
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.e_kitaplar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  yazar text not null default '',
  aciklama text not null default '',
  sinif integer not null check (sinif between 1 and 12),
  siniflar integer[] not null default '{}',
  kelime_sayisi integer not null check (kelime_sayisi between 1 and 100000),
  hedef_hiz integer not null check (hedef_hiz between 10 and 1000),
  tahmini_dk integer not null default 5 check (tahmini_dk between 1 and 120),
  kaynak_turu text not null
    check (kaynak_turu in ('supabase_pdf', 'external_pdf', 'images')),
  dosya_yolu text,
  harici_url text,
  dosya_adi text not null default '',
  dosya_boyutu bigint not null default 0,
  mime_type text not null default 'application/pdf',
  sayfa_sayisi integer not null default 0 check (sayfa_sayisi between 0 and 1000),
  kapak_yolu text,
  kapak_renk text not null default '#0F9F8F',
  kaynak_meta jsonb not null default '{}'::jsonb,
  aktif boolean not null default true,
  gizli boolean not null default false,
  oturum_gerekli boolean not null default false,
  siralama integer not null default 0,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now(),
  check (
    (kaynak_turu = 'supabase_pdf' and coalesce(trim(dosya_yolu), '') <> '')
    or (kaynak_turu = 'external_pdf' and coalesce(trim(harici_url), '') <> '')
    or kaynak_turu = 'images'
  )
);

create table if not exists public.e_kitap_sayfalari (
  id uuid primary key default gen_random_uuid(),
  e_kitap_id uuid not null references public.e_kitaplar(id) on delete cascade,
  sayfa_no integer not null check (sayfa_no > 0),
  dosya_yolu text not null,
  dosya_adi text not null default '',
  dosya_boyutu bigint not null default 0,
  genislik integer not null default 0,
  yukseklik integer not null default 0,
  olusturma_tarihi timestamptz not null default now(),
  unique (e_kitap_id, sayfa_no)
);

create table if not exists public.e_kitap_sorulari (
  id uuid primary key default gen_random_uuid(),
  e_kitap_id uuid not null references public.e_kitaplar(id) on delete cascade,
  soru_metni text not null,
  soru_tipi text not null default 'coktan-secmeli'
    check (soru_tipi in ('coktan-secmeli', 'dogru-yanlis', 'bosluk-doldurma')),
  dogru_metin text,
  aciklama text not null default '',
  sira integer not null default 0,
  olusturma_tarihi timestamptz not null default now()
);

create table if not exists public.e_kitap_secenekleri (
  id uuid primary key default gen_random_uuid(),
  soru_id uuid not null references public.e_kitap_sorulari(id) on delete cascade,
  secenek_metni text not null,
  dogru_mu boolean not null default false,
  sira integer not null default 0,
  unique (soru_id, sira)
);

create table if not exists public.e_kitap_sonuclari (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null unique,
  e_kitap_id uuid references public.e_kitaplar(id) on delete set null,
  e_kitap_adi text not null,
  user_id uuid references auth.users(id) on delete set null,
  visitor_id text not null default '',
  ad text not null,
  soyad text not null,
  sinif integer not null check (sinif between 1 and 12),
  sube text not null default '',
  il text not null default '',
  ilce text not null default '',
  okul text not null default '',
  okuma_suresi_sn numeric(12,2) not null check (okuma_suresi_sn >= 0),
  tamamlanan_sayfa integer not null default 0,
  toplam_sayfa integer not null default 0,
  kelime_sayisi integer not null default 0,
  dakika_kelime integer not null default 0,
  hedef_hiz integer not null default 0,
  dogru_sayisi integer not null default 0,
  yanlis_sayisi integer not null default 0,
  toplam_soru integer not null default 0,
  anlama_yuzdesi integer not null default 0 check (anlama_yuzdesi between 0 and 100),
  cevaplar_json jsonb not null default '[]'::jsonb,
  detay_json jsonb not null default '{}'::jsonb,
  olusturma_tarihi timestamptz not null default now()
);

create table if not exists public.e_kitap_begenileri (
  e_kitap_id uuid not null references public.e_kitaplar(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  olusturma_tarihi timestamptz not null default now(),
  primary key (e_kitap_id, user_id)
);

create table if not exists public.e_kitap_yorumlari (
  id uuid primary key default gen_random_uuid(),
  e_kitap_id uuid not null references public.e_kitaplar(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  gorunen_ad text not null,
  yorum text not null check (char_length(trim(yorum)) between 2 and 1000),
  durum text not null default 'visible' check (durum in ('visible', 'hidden')),
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

create index if not exists idx_e_kitaplar_yayin
  on public.e_kitaplar (aktif, gizli, siralama, olusturma_tarihi desc);
create index if not exists idx_e_kitaplar_siniflar
  on public.e_kitaplar using gin (siniflar);
create index if not exists idx_e_kitap_sayfalari_kitap
  on public.e_kitap_sayfalari (e_kitap_id, sayfa_no);
create index if not exists idx_e_kitap_sorulari_kitap
  on public.e_kitap_sorulari (e_kitap_id, sira);
create index if not exists idx_e_kitap_sonuclari_kitap_sinif
  on public.e_kitap_sonuclari (e_kitap_id, sinif, olusturma_tarihi desc);
create index if not exists idx_e_kitap_sonuclari_user
  on public.e_kitap_sonuclari (user_id, olusturma_tarihi desc);
create index if not exists idx_e_kitap_yorumlari_kitap
  on public.e_kitap_yorumlari (e_kitap_id, durum, olusturma_tarihi desc);

create or replace function public.touch_e_kitap_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.guncelleme_tarihi = now();
  return new;
end;
$$;

drop trigger if exists trg_e_kitaplar_updated_at on public.e_kitaplar;
create trigger trg_e_kitaplar_updated_at
before update on public.e_kitaplar
for each row execute function public.touch_e_kitap_updated_at();

drop trigger if exists trg_e_kitap_yorumlari_updated_at on public.e_kitap_yorumlari;
create trigger trg_e_kitap_yorumlari_updated_at
before update on public.e_kitap_yorumlari
for each row execute function public.touch_e_kitap_updated_at();

update public.e_kitaplar
set siniflar = array[sinif]
where coalesce(cardinality(siniflar), 0) = 0;

-- E-kitap dosyalari private tutulur. Okuma izni storage RLS ile verilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'e-kitaplar',
  'e-kitaplar',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.e_kitaplar enable row level security;
alter table public.e_kitap_sayfalari enable row level security;
alter table public.e_kitap_sorulari enable row level security;
alter table public.e_kitap_secenekleri enable row level security;
alter table public.e_kitap_sonuclari enable row level security;
alter table public.e_kitap_begenileri enable row level security;
alter table public.e_kitap_yorumlari enable row level security;

drop policy if exists "e_kitaplar public read active" on public.e_kitaplar;
create policy "e_kitaplar public read active"
on public.e_kitaplar
for select
to anon, authenticated
using (
  aktif = true
  and (oturum_gerekli = false or auth.uid() is not null)
);

drop policy if exists "e_kitaplar admin manage" on public.e_kitaplar;
create policy "e_kitaplar admin manage"
on public.e_kitaplar
for all
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
)
with check (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap_sayfalari public read" on public.e_kitap_sayfalari;
create policy "e_kitap_sayfalari public read"
on public.e_kitap_sayfalari
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.e_kitaplar e
    where e.id = e_kitap_sayfalari.e_kitap_id
      and e.aktif = true
      and (e.oturum_gerekli = false or auth.uid() is not null)
  )
);

drop policy if exists "e_kitap_sayfalari admin manage" on public.e_kitap_sayfalari;
create policy "e_kitap_sayfalari admin manage"
on public.e_kitap_sayfalari
for all
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
)
with check (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap_sorulari public read" on public.e_kitap_sorulari;
create policy "e_kitap_sorulari public read"
on public.e_kitap_sorulari
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.e_kitaplar e
    where e.id = e_kitap_sorulari.e_kitap_id
      and e.aktif = true
      and (e.oturum_gerekli = false or auth.uid() is not null)
  )
);

drop policy if exists "e_kitap_sorulari admin manage" on public.e_kitap_sorulari;
create policy "e_kitap_sorulari admin manage"
on public.e_kitap_sorulari
for all
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
)
with check (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap_secenekleri public read" on public.e_kitap_secenekleri;
create policy "e_kitap_secenekleri public read"
on public.e_kitap_secenekleri
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.e_kitap_sorulari s
    join public.e_kitaplar e on e.id = s.e_kitap_id
    where s.id = e_kitap_secenekleri.soru_id
      and e.aktif = true
      and (e.oturum_gerekli = false or auth.uid() is not null)
  )
);

drop policy if exists "e_kitap_secenekleri admin manage" on public.e_kitap_secenekleri;
create policy "e_kitap_secenekleri admin manage"
on public.e_kitap_secenekleri
for all
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
)
with check (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap_sonuclari read own" on public.e_kitap_sonuclari;
create policy "e_kitap_sonuclari read own"
on public.e_kitap_sonuclari
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "e_kitap_sonuclari admin read" on public.e_kitap_sonuclari;
create policy "e_kitap_sonuclari admin read"
on public.e_kitap_sonuclari
for select
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_sonuclari', 'okuma_sonuclari_duzenleme', 'okuma_karne']::text[]
  )
);

drop policy if exists "e_kitap_begenileri read" on public.e_kitap_begenileri;
create policy "e_kitap_begenileri read"
on public.e_kitap_begenileri
for select
to anon, authenticated
using (true);

drop policy if exists "e_kitap_begenileri insert own" on public.e_kitap_begenileri;
create policy "e_kitap_begenileri insert own"
on public.e_kitap_begenileri
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "e_kitap_begenileri delete own" on public.e_kitap_begenileri;
create policy "e_kitap_begenileri delete own"
on public.e_kitap_begenileri
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "e_kitap_yorumlari public read" on public.e_kitap_yorumlari;

drop policy if exists "e_kitap_yorumlari delete own" on public.e_kitap_yorumlari;

drop policy if exists "e_kitap_yorumlari admin manage" on public.e_kitap_yorumlari;
create policy "e_kitap_yorumlari admin manage"
on public.e_kitap_yorumlari
for all
to authenticated
using (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_duzenleme', 'okuma_sonuclari_duzenleme']::text[]
  )
)
with check (
  public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_duzenleme', 'okuma_sonuclari_duzenleme']::text[]
  )
);

-- Storage: aktif kitabin dosyasi anonim veya oturumlu okuyucuya SDK download ile acilir.
drop policy if exists "e_kitap storage reader select" on storage.objects;
create policy "e_kitap storage reader select"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'e-kitaplar'
  and exists (
    select 1
    from public.e_kitaplar e
    where e.id::text = split_part(storage.objects.name, '/', 1)
      and e.aktif = true
      and (e.oturum_gerekli = false or auth.uid() is not null)
  )
);

drop policy if exists "e_kitap storage admin select" on storage.objects;
create policy "e_kitap storage admin select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'e-kitaplar'
  and public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap storage admin insert" on storage.objects;
create policy "e_kitap storage admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'e-kitaplar'
  and public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap storage admin update" on storage.objects;
create policy "e_kitap storage admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'e-kitaplar'
  and public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
)
with check (
  bucket_id = 'e-kitaplar'
  and public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

drop policy if exists "e_kitap storage admin delete" on storage.objects;
create policy "e_kitap storage admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'e-kitaplar'
  and public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  )
);

create or replace function public.save_e_kitap_admin(
  p_book jsonb,
  p_pages jsonb default '[]'::jsonb,
  p_questions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_primary_grade integer;
  v_grades integer[];
  v_page jsonb;
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_type text;
  v_correct_count integer;
begin
  if not public.current_admin_has_any_permission(
    array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
  ) then
    raise exception 'Bu islem icin e-kitap yonetim yetkisi gerekli.';
  end if;

  v_id := coalesce(nullif(trim(p_book ->> 'id'), '')::uuid, gen_random_uuid());
  v_primary_grade := greatest(1, least(12, coalesce((p_book ->> 'sinif')::integer, 1)));

  select coalesce(array_agg(distinct value::integer order by value::integer), array[v_primary_grade])
  into v_grades
  from jsonb_array_elements_text(coalesce(p_book -> 'siniflar', jsonb_build_array(v_primary_grade))) item(value)
  where value ~ '^[0-9]+$'
    and value::integer between 1 and 12;

  if coalesce(cardinality(v_grades), 0) = 0 then
    v_grades := array[v_primary_grade];
  end if;

  insert into public.e_kitaplar (
    id, baslik, yazar, aciklama, sinif, siniflar, kelime_sayisi, hedef_hiz,
    tahmini_dk, kaynak_turu, dosya_yolu, harici_url, dosya_adi, dosya_boyutu,
    mime_type, sayfa_sayisi, kapak_yolu, kapak_renk, kaynak_meta, aktif,
    gizli, oturum_gerekli, siralama
  )
  values (
    v_id,
    trim(p_book ->> 'baslik'),
    coalesce(trim(p_book ->> 'yazar'), ''),
    coalesce(trim(p_book ->> 'aciklama'), ''),
    v_primary_grade,
    v_grades,
    greatest(1, least(100000, coalesce((p_book ->> 'kelime_sayisi')::integer, 1))),
    greatest(10, least(1000, coalesce((p_book ->> 'hedef_hiz')::integer, 45))),
    greatest(1, least(120, coalesce((p_book ->> 'tahmini_dk')::integer, 5))),
    coalesce(nullif(p_book ->> 'kaynak_turu', ''), 'supabase_pdf'),
    nullif(trim(p_book ->> 'dosya_yolu'), ''),
    nullif(trim(p_book ->> 'harici_url'), ''),
    coalesce(trim(p_book ->> 'dosya_adi'), ''),
    greatest(0, coalesce((p_book ->> 'dosya_boyutu')::bigint, 0)),
    coalesce(nullif(trim(p_book ->> 'mime_type'), ''), 'application/pdf'),
    greatest(0, least(1000, coalesce((p_book ->> 'sayfa_sayisi')::integer, 0))),
    nullif(trim(p_book ->> 'kapak_yolu'), ''),
    coalesce(nullif(trim(p_book ->> 'kapak_renk'), ''), '#0F9F8F'),
    coalesce(p_book -> 'kaynak_meta', '{}'::jsonb),
    coalesce((p_book ->> 'aktif')::boolean, true),
    coalesce((p_book ->> 'gizli')::boolean, false),
    coalesce((p_book ->> 'oturum_gerekli')::boolean, false),
    coalesce((p_book ->> 'siralama')::integer, 0)
  )
  on conflict (id) do update set
    baslik = excluded.baslik,
    yazar = excluded.yazar,
    aciklama = excluded.aciklama,
    sinif = excluded.sinif,
    siniflar = excluded.siniflar,
    kelime_sayisi = excluded.kelime_sayisi,
    hedef_hiz = excluded.hedef_hiz,
    tahmini_dk = excluded.tahmini_dk,
    kaynak_turu = excluded.kaynak_turu,
    dosya_yolu = excluded.dosya_yolu,
    harici_url = excluded.harici_url,
    dosya_adi = excluded.dosya_adi,
    dosya_boyutu = excluded.dosya_boyutu,
    mime_type = excluded.mime_type,
    sayfa_sayisi = excluded.sayfa_sayisi,
    kapak_yolu = excluded.kapak_yolu,
    kapak_renk = excluded.kapak_renk,
    kaynak_meta = excluded.kaynak_meta,
    aktif = excluded.aktif,
    gizli = excluded.gizli,
    oturum_gerekli = excluded.oturum_gerekli,
    siralama = excluded.siralama,
    guncelleme_tarihi = now();

  delete from public.e_kitap_sayfalari where e_kitap_id = v_id;
  if jsonb_typeof(coalesce(p_pages, '[]'::jsonb)) = 'array' then
    for v_page in select value from jsonb_array_elements(p_pages)
    loop
      insert into public.e_kitap_sayfalari (
        e_kitap_id, sayfa_no, dosya_yolu, dosya_adi, dosya_boyutu, genislik, yukseklik
      )
      values (
        v_id,
        greatest(1, coalesce((v_page ->> 'sayfa_no')::integer, 1)),
        trim(v_page ->> 'dosya_yolu'),
        coalesce(trim(v_page ->> 'dosya_adi'), ''),
        greatest(0, coalesce((v_page ->> 'dosya_boyutu')::bigint, 0)),
        greatest(0, coalesce((v_page ->> 'genislik')::integer, 0)),
        greatest(0, coalesce((v_page ->> 'yukseklik')::integer, 0))
      );
    end loop;
  end if;

  delete from public.e_kitap_sorulari where e_kitap_id = v_id;
  if jsonb_typeof(coalesce(p_questions, '[]'::jsonb)) = 'array' then
    for v_question in select value from jsonb_array_elements(p_questions)
    loop
      v_type := coalesce(nullif(v_question ->> 'soru_tipi', ''), 'coktan-secmeli');
      if v_type not in ('coktan-secmeli', 'dogru-yanlis', 'bosluk-doldurma') then
        raise exception 'Gecersiz soru tipi: %', v_type;
      end if;
      if coalesce(trim(v_question ->> 'soru_metni'), '') = '' then
        raise exception 'Soru metni bos olamaz.';
      end if;

      insert into public.e_kitap_sorulari (
        e_kitap_id, soru_metni, soru_tipi, dogru_metin, aciklama, sira
      )
      values (
        v_id,
        trim(v_question ->> 'soru_metni'),
        v_type,
        nullif(trim(v_question ->> 'dogru_metin'), ''),
        coalesce(trim(v_question ->> 'aciklama'), ''),
        coalesce((v_question ->> 'sira')::integer, 0)
      )
      returning id into v_question_id;

      if v_type <> 'bosluk-doldurma' then
        v_correct_count := 0;
        for v_option in
          select value from jsonb_array_elements(coalesce(v_question -> 'secenekler', '[]'::jsonb))
        loop
          if coalesce((v_option ->> 'dogru_mu')::boolean, false) then
            v_correct_count := v_correct_count + 1;
          end if;
          insert into public.e_kitap_secenekleri (
            soru_id, secenek_metni, dogru_mu, sira
          )
          values (
            v_question_id,
            trim(v_option ->> 'secenek_metni'),
            coalesce((v_option ->> 'dogru_mu')::boolean, false),
            coalesce((v_option ->> 'sira')::integer, 0)
          );
        end loop;
        if v_correct_count <> 1 then
          raise exception 'Her test veya dogru-yanlis sorusunda tam bir dogru cevap olmali.';
        end if;
      elsif coalesce(trim(v_question ->> 'dogru_metin'), '') = '' then
        raise exception 'Bosluk doldurma sorusunda dogru cevap zorunludur.';
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

create or replace function public.get_e_kitap_benchmark(
  p_e_kitap_id uuid,
  p_sinif integer
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with latest_reader_results as (
    select
      s.*,
      row_number() over (
        partition by coalesce(s.user_id::text, nullif(s.visitor_id, ''), s.attempt_id)
        order by s.olusturma_tarihi desc
      ) as reader_rank
    from public.e_kitap_sonuclari s
    where s.e_kitap_id = p_e_kitap_id
      and s.sinif = p_sinif
      and s.okuma_suresi_sn >= 10
  )
  select jsonb_build_object(
    'reader_count', count(*)::integer,
    'average_wpm', coalesce(round(avg(nullif(dakika_kelime, 0)))::integer, 0),
    'average_comprehension', coalesce(round(avg(anlama_yuzdesi))::integer, 0),
    'average_duration_sec', coalesce(round(avg(okuma_suresi_sn))::integer, 0),
    'average_pages_per_minute',
      coalesce(
        round(
          avg(
            case
              when okuma_suresi_sn > 0
              then toplam_sayfa / (okuma_suresi_sn / 60.0)
              else null
            end
          )::numeric,
          2
        ),
        0
      )
  )
  from latest_reader_results
  where reader_rank = 1;
$$;

create or replace function public.get_e_kitap_admin_stats()
returns table (
  e_kitap_id uuid,
  sinif integer,
  reader_count integer,
  average_wpm integer,
  average_comprehension integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.current_admin_has_any_permission(
    array[
      'okuma_metinleri',
      'okuma_metni_ekleme',
      'okuma_metni_duzenleme',
      'okuma_sonuclari',
      'okuma_sonuclari_duzenleme',
      'okuma_karne'
    ]::text[]
  ) then
    raise exception 'Bu islem icin e-kitap veya okuma sonucu yetkisi gerekli.';
  end if;

  return query
  with latest_reader_results as (
    select
      s.e_kitap_id,
      s.sinif,
      s.dakika_kelime,
      s.anlama_yuzdesi,
      row_number() over (
        partition by
          s.e_kitap_id,
          s.sinif,
          coalesce(s.user_id::text, nullif(s.visitor_id, ''), s.attempt_id)
        order by s.olusturma_tarihi desc
      ) as reader_rank
    from public.e_kitap_sonuclari s
    where s.e_kitap_id is not null
      and s.okuma_suresi_sn >= 10
  )
  select
    r.e_kitap_id,
    r.sinif,
    count(*)::integer,
    coalesce(round(avg(nullif(r.dakika_kelime, 0)))::integer, 0),
    coalesce(round(avg(r.anlama_yuzdesi))::integer, 0)
  from latest_reader_results r
  where r.reader_rank = 1
  group by r.e_kitap_id, r.sinif
  order by r.e_kitap_id, r.sinif;
end;
$$;

create or replace function public.save_e_kitap_result(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_book public.e_kitaplar%rowtype;
  v_existing public.e_kitap_sonuclari%rowtype;
  v_result public.e_kitap_sonuclari%rowtype;
  v_attempt_id text;
  v_answer jsonb;
  v_question public.e_kitap_sorulari%rowtype;
  v_selected_option text;
  v_selected_text text;
  v_is_correct boolean;
  v_answers jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_comprehension integer := 0;
  v_seconds numeric(12,2);
  v_wpm integer := 0;
  v_grade integer;
begin
  v_attempt_id := nullif(trim(p_payload ->> 'attempt_id'), '');
  if v_attempt_id is null then
    raise exception 'attempt_id zorunludur.';
  end if;

  select *
  into v_existing
  from public.e_kitap_sonuclari
  where attempt_id = v_attempt_id;

  if found then
    return jsonb_build_object(
      'result', to_jsonb(v_existing),
      'benchmark', public.get_e_kitap_benchmark(v_existing.e_kitap_id, v_existing.sinif),
      'idempotent', true
    );
  end if;

  select *
  into v_book
  from public.e_kitaplar
  where id = nullif(trim(p_payload ->> 'e_kitap_id'), '')::uuid
    and aktif = true;

  if not found then
    raise exception 'E-kitap bulunamadi veya yayinda degil.';
  end if;

  v_grade := greatest(1, least(12, coalesce((p_payload ->> 'sinif')::integer, v_book.sinif)));
  v_seconds := greatest(1, least(14400, coalesce((p_payload ->> 'okuma_suresi_sn')::numeric, 1)));
  v_wpm := round(v_book.kelime_sayisi / (v_seconds / 60.0));

  select count(*)::integer
  into v_total
  from public.e_kitap_sorulari
  where e_kitap_id = v_book.id;

  if jsonb_typeof(coalesce(p_payload -> 'cevaplar', '[]'::jsonb)) = 'array' then
    for v_answer in select value from jsonb_array_elements(p_payload -> 'cevaplar')
    loop
      select *
      into v_question
      from public.e_kitap_sorulari
      where id::text = v_answer ->> 'soru_id'
        and e_kitap_id = v_book.id;

      if not found then
        continue;
      end if;

      v_selected_option := nullif(trim(v_answer ->> 'secenek_id'), '');
      v_selected_text := coalesce(trim(v_answer ->> 'metin'), '');
      v_is_correct := false;

      if v_question.soru_tipi = 'bosluk-doldurma' then
        v_is_correct := lower(trim(coalesce(v_question.dogru_metin, ''))) = lower(v_selected_text);
      else
        select exists (
          select 1
          from public.e_kitap_secenekleri s
          where s.soru_id = v_question.id
            and s.id::text = v_selected_option
            and s.dogru_mu = true
        )
        into v_is_correct;
      end if;

      if v_is_correct then
        v_correct := v_correct + 1;
      end if;

      v_answers := v_answers || jsonb_build_array(
        jsonb_build_object(
          'soru_id', v_question.id,
          'soru_metni', v_question.soru_metni,
          'soru_tipi', v_question.soru_tipi,
          'secenek_id', v_selected_option,
          'cevap_metni', v_selected_text,
          'dogru_mu', v_is_correct,
          'dogru_metin', v_question.dogru_metin
        )
      );
    end loop;
  end if;

  v_wrong := greatest(0, v_total - v_correct);
  v_comprehension := case
    when v_total > 0 then round((v_correct::numeric / v_total::numeric) * 100)
    else 0
  end;

  insert into public.e_kitap_sonuclari (
    attempt_id, e_kitap_id, e_kitap_adi, user_id, visitor_id,
    ad, soyad, sinif, sube, il, ilce, okul, okuma_suresi_sn,
    tamamlanan_sayfa, toplam_sayfa, kelime_sayisi, dakika_kelime,
    hedef_hiz, dogru_sayisi, yanlis_sayisi, toplam_soru,
    anlama_yuzdesi, cevaplar_json, detay_json
  )
  values (
    v_attempt_id,
    v_book.id,
    v_book.baslik,
    auth.uid(),
    coalesce(trim(p_payload ->> 'visitor_id'), ''),
    left(coalesce(nullif(trim(p_payload ->> 'ad'), ''), 'Okuyucu'), 80),
    left(coalesce(nullif(trim(p_payload ->> 'soyad'), ''), '-'), 80),
    v_grade,
    left(coalesce(trim(p_payload ->> 'sube'), ''), 20),
    left(coalesce(trim(p_payload ->> 'il'), ''), 80),
    left(coalesce(trim(p_payload ->> 'ilce'), ''), 80),
    left(coalesce(trim(p_payload ->> 'okul'), ''), 180),
    v_seconds,
    greatest(0, least(v_book.sayfa_sayisi, coalesce((p_payload ->> 'tamamlanan_sayfa')::integer, v_book.sayfa_sayisi))),
    v_book.sayfa_sayisi,
    v_book.kelime_sayisi,
    greatest(0, v_wpm),
    v_book.hedef_hiz,
    v_correct,
    v_wrong,
    v_total,
    v_comprehension,
    v_answers,
    coalesce(p_payload -> 'detay_json', '{}'::jsonb)
  )
  on conflict (attempt_id) do nothing
  returning * into v_result;

  if v_result.id is null then
    select * into v_result
    from public.e_kitap_sonuclari
    where attempt_id = v_attempt_id;
  end if;

  return jsonb_build_object(
    'result', to_jsonb(v_result),
    'benchmark', public.get_e_kitap_benchmark(v_book.id, v_grade),
    'idempotent', false
  );
end;
$$;

create or replace function public.toggle_e_kitap_begeni(
  p_e_kitap_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Begeni icin oturum gerekli.';
  end if;
  if not exists (select 1 from public.e_kitaplar where id = p_e_kitap_id and aktif = true) then
    raise exception 'E-kitap bulunamadi.';
  end if;

  if exists (
    select 1 from public.e_kitap_begenileri
    where e_kitap_id = p_e_kitap_id and user_id = v_user
  ) then
    delete from public.e_kitap_begenileri
    where e_kitap_id = p_e_kitap_id and user_id = v_user;
    v_liked := false;
  else
    insert into public.e_kitap_begenileri (e_kitap_id, user_id)
    values (p_e_kitap_id, v_user)
    on conflict do nothing;
    v_liked := true;
  end if;

  select count(*)::integer into v_count
  from public.e_kitap_begenileri
  where e_kitap_id = p_e_kitap_id;

  return jsonb_build_object('liked', v_liked, 'count', v_count);
end;
$$;

create or replace function public.get_e_kitap_social(
  p_e_kitap_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'like_count', (
      select count(*)::integer
      from public.e_kitap_begenileri b
      where b.e_kitap_id = p_e_kitap_id
    ),
    'liked', (
      auth.uid() is not null
      and exists (
        select 1
        from public.e_kitap_begenileri b
        where b.e_kitap_id = p_e_kitap_id
          and b.user_id = auth.uid()
      )
    ),
    'comment_count', (
      select count(*)::integer
      from public.e_kitap_yorumlari y
      where y.e_kitap_id = p_e_kitap_id
        and y.durum = 'visible'
    )
  );
$$;

create or replace function public.add_e_kitap_yorumu(
  p_e_kitap_id uuid,
  p_yorum text
)
returns public.e_kitap_yorumlari
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_row public.e_kitap_yorumlari%rowtype;
begin
  if v_user is null then
    raise exception 'Yorum icin oturum gerekli.';
  end if;
  if char_length(trim(coalesce(p_yorum, ''))) not between 2 and 1000 then
    raise exception 'Yorum 2 ile 1000 karakter arasinda olmali.';
  end if;
  if not exists (select 1 from public.e_kitaplar where id = p_e_kitap_id and aktif = true) then
    raise exception 'E-kitap bulunamadi.';
  end if;

  select coalesce(
    nullif(trim(full_name), ''),
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    split_part(coalesce(email, ''), '@', 1),
    'Okuyucu'
  )
  into v_name
  from public.user_profiles
  where id = v_user;

  if coalesce(trim(v_name), '') = '' then
    v_name := 'Okuyucu';
  end if;

  insert into public.e_kitap_yorumlari (
    e_kitap_id, user_id, gorunen_ad, yorum
  )
  values (
    p_e_kitap_id, v_user, left(v_name, 100), trim(p_yorum)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Kaydetme altyapisinin e-kitap turunu kabul etmesi.
do $$
begin
  if to_regclass('public.user_content_progress') is not null then
    execute 'alter table public.user_content_progress drop constraint if exists user_content_progress_content_type_check';
    execute $sql$
      alter table public.user_content_progress
      add constraint user_content_progress_content_type_check
      check (content_type in (
        'reading', 'ebook', 'exam', 'document', 'worksheet', 'video', 'game', 'content'
      ))
    $sql$;
  end if;
end $$;

grant select on public.e_kitaplar, public.e_kitap_sayfalari,
  public.e_kitap_sorulari, public.e_kitap_secenekleri,
  public.e_kitap_begenileri
to anon, authenticated;

grant select on public.e_kitap_sonuclari to authenticated;
revoke all on public.e_kitap_yorumlari from anon, authenticated;

revoke all on function public.save_e_kitap_admin(jsonb, jsonb, jsonb) from public;
revoke all on function public.save_e_kitap_result(jsonb) from public;
revoke all on function public.get_e_kitap_benchmark(uuid, integer) from public;
revoke all on function public.get_e_kitap_admin_stats() from public;
revoke all on function public.toggle_e_kitap_begeni(uuid) from public;
revoke all on function public.get_e_kitap_social(uuid) from public;
revoke all on function public.add_e_kitap_yorumu(uuid, text) from public;
revoke all on function public.add_e_kitap_yorumu(uuid, text) from anon, authenticated;

grant execute on function public.save_e_kitap_admin(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_e_kitap_result(jsonb) to anon, authenticated;
grant execute on function public.get_e_kitap_benchmark(uuid, integer) to anon, authenticated;
grant execute on function public.get_e_kitap_admin_stats() to authenticated;
grant execute on function public.toggle_e_kitap_begeni(uuid) to authenticated;
grant execute on function public.get_e_kitap_social(uuid) to anon, authenticated;

select
  'e_kitaplar' as module,
  (select count(*) from public.e_kitaplar) as kitap_sayisi,
  (select count(*) from public.e_kitap_sonuclari) as sonuc_sayisi,
  (select public from storage.buckets where id = 'e-kitaplar') as bucket_public;
