-- ==========================================================
-- Kemal Ogretmenim - PDF Calisma Kagitlari
-- Bu scripti `supabase-dokumanlar.sql` sonrasinda calistirin.
-- Amac:
-- 1. PDF dokumanlarina bagli etkilesimli calisma kagitlari olusturmak
-- 2. Ogrenciye sadece guvenli alan bilgilerini acmak
-- 3. Cevaplari sunucu tarafinda puanlayip 100'lük skor uretmek
-- ==========================================================

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

create table if not exists public.calisma_kagitlari (
  id uuid primary key default gen_random_uuid(),
  dokuman_id uuid not null unique references public.dokumanlar(id) on delete cascade,
  yonerge text,
  aktif boolean not null default true,
  yayinda boolean not null default false,
  gecis_notu integer not null default 60 check (gecis_notu between 0 and 100),
  izinli_deneme integer not null default 0 check (izinli_deneme >= 0),
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.calisma_kagitlari
  add column if not exists yonerge text,
  add column if not exists aktif boolean not null default true,
  add column if not exists yayinda boolean not null default false,
  add column if not exists gecis_notu integer not null default 60,
  add column if not exists izinli_deneme integer not null default 0,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

create table if not exists public.calisma_kagidi_alanlari (
  id uuid primary key default gen_random_uuid(),
  calisma_kagidi_id uuid not null references public.calisma_kagitlari(id) on delete cascade,
  soru_kodu text not null,
  soru_etiketi text not null,
  alan_tipi text not null check (alan_tipi in ('dogru-yanlis', 'tek-secim', 'coklu-secim', 'eslestirme')),
  sayfa_no integer not null check (sayfa_no >= 1),
  x numeric(8,6) not null default 0 check (x >= 0 and x <= 1),
  y numeric(8,6) not null default 0 check (y >= 0 and y <= 1),
  genislik numeric(8,6) not null default 0.25 check (genislik > 0 and genislik <= 1),
  yukseklik numeric(8,6) not null default 0.12 check (yukseklik > 0 and yukseklik <= 1),
  puan numeric(8,2) not null default 10 check (puan >= 0),
  zorunlu boolean not null default true,
  sira integer not null default 1,
  ayar_json jsonb not null default '{}'::jsonb,
  cevap_json jsonb not null default '{}'::jsonb,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.calisma_kagidi_alanlari
  add column if not exists soru_kodu text,
  add column if not exists soru_etiketi text,
  add column if not exists alan_tipi text,
  add column if not exists sayfa_no integer,
  add column if not exists x numeric(8,6) not null default 0,
  add column if not exists y numeric(8,6) not null default 0,
  add column if not exists genislik numeric(8,6) not null default 0.25,
  add column if not exists yukseklik numeric(8,6) not null default 0.12,
  add column if not exists puan numeric(8,2) not null default 10,
  add column if not exists zorunlu boolean not null default true,
  add column if not exists sira integer not null default 1,
  add column if not exists ayar_json jsonb not null default '{}'::jsonb,
  add column if not exists cevap_json jsonb not null default '{}'::jsonb,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

create table if not exists public.calisma_kagidi_gonderimleri (
  id uuid primary key default gen_random_uuid(),
  dokuman_id uuid not null references public.dokumanlar(id) on delete cascade,
  calisma_kagidi_id uuid not null references public.calisma_kagitlari(id) on delete cascade,
  ad text not null,
  soyad text not null,
  sinif integer not null,
  sube text not null,
  yanit_json jsonb not null default '{}'::jsonb,
  sonuc_detay_json jsonb not null default '[]'::jsonb,
  ham_puan numeric(8,2) not null default 0,
  maksimum_ham_puan numeric(8,2) not null default 0,
  puan_100luk integer not null default 0,
  dogru_sayisi integer not null default 0,
  yanlis_sayisi integer not null default 0,
  toplam_alan integer not null default 0,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.calisma_kagidi_gonderimleri
  add column if not exists dokuman_id uuid references public.dokumanlar(id) on delete cascade,
  add column if not exists calisma_kagidi_id uuid references public.calisma_kagitlari(id) on delete cascade,
  add column if not exists ad text,
  add column if not exists soyad text,
  add column if not exists sinif integer,
  add column if not exists sube text,
  add column if not exists yanit_json jsonb not null default '{}'::jsonb,
  add column if not exists sonuc_detay_json jsonb not null default '[]'::jsonb,
  add column if not exists ham_puan numeric(8,2) not null default 0,
  add column if not exists maksimum_ham_puan numeric(8,2) not null default 0,
  add column if not exists puan_100luk integer not null default 0,
  add column if not exists dogru_sayisi integer not null default 0,
  add column if not exists yanlis_sayisi integer not null default 0,
  add column if not exists toplam_alan integer not null default 0,
  add column if not exists olusturma_tarihi timestamptz not null default now();

alter table public.calisma_kagitlari enable row level security;
alter table public.calisma_kagidi_alanlari enable row level security;
alter table public.calisma_kagidi_gonderimleri enable row level security;

drop policy if exists "calisma kagitlari public read published" on public.calisma_kagitlari;
create policy "calisma kagitlari public read published"
on public.calisma_kagitlari
for select
using (aktif = true and yayinda = true);

drop policy if exists "calisma kagitlari auth manage" on public.calisma_kagitlari;
create policy "calisma kagitlari auth manage"
on public.calisma_kagitlari
for all
to authenticated
using (true)
with check (true);

drop policy if exists "calisma alani auth manage" on public.calisma_kagidi_alanlari;
create policy "calisma alani auth manage"
on public.calisma_kagidi_alanlari
for all
to authenticated
using (true)
with check (true);

drop policy if exists "calisma gonderim auth read" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth read"
on public.calisma_kagidi_gonderimleri
for select
to authenticated
using (true);

drop policy if exists "calisma gonderim auth delete" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth delete"
on public.calisma_kagidi_gonderimleri
for delete
to authenticated
using (true);

drop policy if exists "calisma gonderim auth update" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth update"
on public.calisma_kagidi_gonderimleri
for update
to authenticated
using (true)
with check (true);

create index if not exists idx_calisma_kagitlari_dokuman
  on public.calisma_kagitlari (dokuman_id, yayinda, aktif);

create index if not exists idx_calisma_kagidi_alanlari_sheet
  on public.calisma_kagidi_alanlari (calisma_kagidi_id, sayfa_no, sira);

create index if not exists idx_calisma_gonderim_doc_student
  on public.calisma_kagidi_gonderimleri (dokuman_id, sinif, sube, olusturma_tarihi desc);

grant select on public.calisma_kagitlari to anon;
grant select, insert, update, delete on public.calisma_kagitlari to authenticated;
grant select, insert, update, delete on public.calisma_kagidi_alanlari to authenticated;
grant select, update, delete on public.calisma_kagidi_gonderimleri to authenticated;

create or replace view public.calisma_kagidi_ogrenci_alanlari as
select
  a.id,
  w.dokuman_id,
  a.soru_kodu,
  a.soru_etiketi,
  a.alan_tipi,
  a.sayfa_no,
  a.x,
  a.y,
  a.genislik,
  a.yukseklik,
  a.puan,
  a.zorunlu,
  a.sira,
  a.ayar_json
from public.calisma_kagidi_alanlari a
join public.calisma_kagitlari w on w.id = a.calisma_kagidi_id
where w.aktif = true and w.yayinda = true;

grant select on public.calisma_kagidi_ogrenci_alanlari to anon, authenticated;

create or replace function public.calisma_kagidi_cevap_dogru_mu(
  p_alan_tipi text,
  p_cevap jsonb,
  p_yanit jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_tip text := lower(coalesce(trim(p_alan_tipi), ''));
  v_beklenen text;
  v_gelen text;
begin
  if v_tip = 'dogru-yanlis' then
    v_beklenen := lower(coalesce(p_cevap ->> 'dogru_deger', ''));
    v_gelen := lower(trim(both '"' from coalesce(p_yanit::text, '')));
    return v_beklenen <> '' and v_beklenen = v_gelen;
  end if;

  if v_tip = 'tek-secim' then
    v_beklenen := coalesce(p_cevap ->> 'dogru_secenek', '');
    v_gelen := trim(both '"' from coalesce(p_yanit::text, ''));
    return v_beklenen <> '' and v_beklenen = v_gelen;
  end if;

  if v_tip = 'coklu-secim' then
    return coalesce(p_cevap -> 'dogru_secenekler', '{}'::jsonb) = coalesce(p_yanit, '{}'::jsonb);
  end if;

  if v_tip = 'eslestirme' then
    return coalesce(p_cevap -> 'eslesmeler', '{}'::jsonb) = coalesce(p_yanit, '{}'::jsonb);
  end if;

  return false;
end;
$$;

create or replace function public.submit_calisma_kagidi(
  p_dokuman_id uuid,
  p_ad text,
  p_soyad text,
  p_sinif integer,
  p_sube text,
  p_yanitlar jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calisma public.calisma_kagitlari%rowtype;
  v_alan record;
  v_ham_puan numeric(8,2) := 0;
  v_maks_puan numeric(8,2) := 0;
  v_dogru integer := 0;
  v_yanlis integer := 0;
  v_toplam integer := 0;
  v_puan_100 integer := 0;
  v_detay jsonb := '[]'::jsonb;
  v_yanit jsonb;
  v_dogru_mu boolean;
  v_gonderim_id uuid;
  v_mevcut_deneme integer := 0;
begin
  if p_dokuman_id is null then
    raise exception 'Dokuman kimligi zorunludur.';
  end if;

  if coalesce(trim(p_ad), '') = '' or coalesce(trim(p_soyad), '') = '' or coalesce(trim(p_sube), '') = '' or coalesce(p_sinif, 0) <= 0 then
    raise exception 'Ogrenci bilgileri eksik.';
  end if;

  select *
  into v_calisma
  from public.calisma_kagitlari
  where dokuman_id = p_dokuman_id
    and aktif = true
    and yayinda = true
  limit 1;

  if not found then
    raise exception 'Yayinlanmis calisma kagidi bulunamadi.';
  end if;

  if v_calisma.izinli_deneme > 0 then
    select count(*)
    into v_mevcut_deneme
    from public.calisma_kagidi_gonderimleri
    where dokuman_id = p_dokuman_id
      and lower(ad) = lower(trim(p_ad))
      and lower(soyad) = lower(trim(p_soyad))
      and sinif = p_sinif
      and lower(sube) = lower(trim(p_sube));

    if v_mevcut_deneme >= v_calisma.izinli_deneme then
      raise exception 'Bu ogrenci icin izin verilen deneme sayisi doldu.';
    end if;
  end if;

  for v_alan in
    select *
    from public.calisma_kagidi_alanlari
    where calisma_kagidi_id = v_calisma.id
    order by sayfa_no asc, sira asc, olusturma_tarihi asc
  loop
    v_toplam := v_toplam + 1;
    v_maks_puan := v_maks_puan + coalesce(v_alan.puan, 0);
    v_yanit := coalesce(p_yanitlar -> (v_alan.id::text), 'null'::jsonb);
    v_dogru_mu := public.calisma_kagidi_cevap_dogru_mu(v_alan.alan_tipi, v_alan.cevap_json, v_yanit);

    if v_dogru_mu then
      v_ham_puan := v_ham_puan + coalesce(v_alan.puan, 0);
      v_dogru := v_dogru + 1;
    else
      v_yanlis := v_yanlis + 1;
    end if;

    v_detay := v_detay || jsonb_build_array(
      jsonb_build_object(
        'alan_id', v_alan.id,
        'etiket', v_alan.soru_etiketi,
        'alan_tipi', v_alan.alan_tipi,
        'dogru', v_dogru_mu,
        'verilen_puan', case when v_dogru_mu then coalesce(v_alan.puan, 0) else 0 end,
        'maksimum_puan', coalesce(v_alan.puan, 0)
      )
    );
  end loop;

  if v_maks_puan > 0 then
    v_puan_100 := round((v_ham_puan / v_maks_puan) * 100);
  end if;

  insert into public.calisma_kagidi_gonderimleri (
    dokuman_id,
    calisma_kagidi_id,
    ad,
    soyad,
    sinif,
    sube,
    yanit_json,
    sonuc_detay_json,
    ham_puan,
    maksimum_ham_puan,
    puan_100luk,
    dogru_sayisi,
    yanlis_sayisi,
    toplam_alan
  )
  values (
    p_dokuman_id,
    v_calisma.id,
    trim(p_ad),
    trim(p_soyad),
    p_sinif,
    trim(p_sube),
    coalesce(p_yanitlar, '{}'::jsonb),
    v_detay,
    v_ham_puan,
    v_maks_puan,
    v_puan_100,
    v_dogru,
    v_yanlis,
    v_toplam
  )
  returning id into v_gonderim_id;

  return jsonb_build_object(
    'gonderim_id', v_gonderim_id,
    'puan_100luk', v_puan_100,
    'ham_puan', v_ham_puan,
    'maksimum_ham_puan', v_maks_puan,
    'dogru_sayisi', v_dogru,
    'yanlis_sayisi', v_yanlis,
    'toplam_alan', v_toplam,
    'gecis_notu', v_calisma.gecis_notu,
    'gecti', (v_puan_100 >= v_calisma.gecis_notu),
    'detaylar', v_detay
  );
end;
$$;

grant execute on function public.calisma_kagidi_cevap_dogru_mu(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.submit_calisma_kagidi(uuid, text, text, integer, text, jsonb) to anon, authenticated;
