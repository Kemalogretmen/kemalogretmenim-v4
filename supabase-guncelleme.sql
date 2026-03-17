-- ================================================
-- KEMAL ÖĞRETMENİM — Supabase Güncelleme v2
-- Çoklu sınıf desteği için sütun ekle
-- SQL Editor'de çalıştırın
-- ================================================

-- metinler tablosuna siniflar (array) sütunu ekle
ALTER TABLE metinler ADD COLUMN IF NOT EXISTS siniflar INTEGER[] DEFAULT '{}';
ALTER TABLE metinler ADD COLUMN IF NOT EXISTS icerik_html TEXT;

-- Mevcut kayıtların siniflar alanını sinif değerinden doldur
UPDATE metinler SET siniflar = ARRAY[sinif] WHERE siniflar IS NULL OR siniflar = '{}';

-- Doğrulama
SELECT id, baslik, sinif, siniflar FROM metinler LIMIT 5;

SELECT 'Güncelleme tamamlandı! ✅' AS durum;
