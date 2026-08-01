-- Kemal Ogretmenim - Okuma sorularinin tekrar eklenmesini kalici olarak engeller.
-- Supabase SQL Editor icinde bir kez calistirilir.
--
-- Yaptiklari:
-- 1. Egitim profili ve yeni soru alanlarini tamamlar.
-- 2. Ayni metin/sira icin olusmus mevcut tekrar sorulari temizler.
-- 3. Ayni soru sirasinin yeniden eklenmesini veritabani seviyesinde engeller.
-- 4. Sorulari ve secenekleri tek transaction icinde degistiren RPC'yi kurar.

begin;

alter table if exists public.metinler
  add column if not exists egitim_json jsonb not null default '{}'::jsonb;

alter table if exists public.sorular
  add column if not exists soru_tipi text not null default 'coktan-secmeli',
  add column if not exists ayar_json jsonb not null default '{}'::jsonb;

lock table public.sorular in share row exclusive mode;
lock table public.secenekler in share row exclusive mode;

-- Son yazilan kaydi koru; ayni metin ve sira numarasindaki eskileri sil.
with ranked_questions as (
  select
    id,
    row_number() over (
      partition by metin_id, sira
      order by (xmin::text)::bigint desc, id desc
    ) as duplicate_rank
  from public.sorular
)
delete from public.sorular question
using ranked_questions ranked
where question.id = ranked.id
  and ranked.duplicate_rank > 1;

-- Eski kayitlardan kalmis tekrar secenekleri de temizle.
with ranked_choices as (
  select
    id,
    row_number() over (
      partition by soru_id, sira
      order by (xmin::text)::bigint desc, id desc
    ) as duplicate_rank
  from public.secenekler
)
delete from public.secenekler choice
using ranked_choices ranked
where choice.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists uq_sorular_metin_sira
  on public.sorular (metin_id, sira);

create unique index if not exists uq_secenekler_soru_sira
  on public.secenekler (soru_id, sira);

create index if not exists idx_metinler_egitim_seviye
  on public.metinler ((egitim_json ->> 'seviye'));

create index if not exists idx_metinler_egitim_tur
  on public.metinler ((egitim_json ->> 'tur'));

create or replace function public.replace_reading_questions(
  p_metin_id uuid,
  p_questions jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_item jsonb;
  choice_item jsonb;
  question_id uuid;
  question_order bigint;
  choice_order bigint;
  saved_count integer := 0;
begin
  if auth.uid() is null
    or not public.current_admin_has_any_permission(array[
      'okuma_metni_ekleme',
      'okuma_metni_duzenleme'
    ])
  then
    raise exception 'Okuma sorularini kaydetme yetkiniz yok.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.metinler
    where id = p_metin_id
  ) then
    raise exception 'Okuma metni bulunamadi.';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Sorular JSON dizi biciminde olmalidir.';
  end if;

  perform pg_advisory_xact_lock(hashtext('reading-questions:' || p_metin_id::text));

  delete from public.sorular
  where metin_id = p_metin_id;

  for question_item, question_order in
    select value, ordinality
    from jsonb_array_elements(p_questions) with ordinality
  loop
    if coalesce(trim(question_item ->> 'soru_metni'), '') = '' then
      raise exception 'Bos soru metni kaydedilemez.';
    end if;

    insert into public.sorular (
      metin_id,
      soru_metni,
      soru_tipi,
      ayar_json,
      sira
    )
    values (
      p_metin_id,
      trim(question_item ->> 'soru_metni'),
      coalesce(nullif(trim(question_item ->> 'soru_tipi'), ''), 'coktan-secmeli'),
      coalesce(question_item -> 'ayar_json', '{}'::jsonb),
      coalesce(nullif(trim(question_item ->> 'sira'), '')::integer, question_order::integer)
    )
    returning id into question_id;

    for choice_item, choice_order in
      select value, ordinality
      from jsonb_array_elements(coalesce(question_item -> 'secenekler', '[]'::jsonb))
        with ordinality
    loop
      if coalesce(trim(choice_item ->> 'secenek_metni'), '') = '' then
        raise exception 'Bos secenek kaydedilemez.';
      end if;

      insert into public.secenekler (
        soru_id,
        secenek_metni,
        dogru_mu,
        sira
      )
      values (
        question_id,
        trim(choice_item ->> 'secenek_metni'),
        coalesce((choice_item ->> 'dogru_mu')::boolean, false),
        coalesce(nullif(trim(choice_item ->> 'sira'), '')::integer, choice_order::integer)
      );
    end loop;

    saved_count := saved_count + 1;
  end loop;

  return saved_count;
end;
$$;

revoke all on function public.replace_reading_questions(uuid, jsonb) from public;
grant execute on function public.replace_reading_questions(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Beklenen sonuc: Her iki sayi da 0 olmali.
select count(*) as tekrar_soru_grubu
from (
  select metin_id, sira
  from public.sorular
  group by metin_id, sira
  having count(*) > 1
) duplicates;

select count(*) as tekrar_secenek_grubu
from (
  select soru_id, sira
  from public.secenekler
  group by soru_id, sira
  having count(*) > 1
) duplicates;
