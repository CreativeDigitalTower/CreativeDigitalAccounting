-- READ-ONLY диагностика за фирменото лого (пример: VEST 98 LTD, ЕИК 205516962).
-- Не променя данни. Изпълни на production (psql) и сподели резултата.
-- 1) План + наличие/формат/размер на логото (БЕЗ да печата целия base64).
SELECT c.id,
       c.name,
       c.eik,
       s.plan                                   AS subscription_plan,
       (c."logoUrl" IS NOT NULL)                AS has_logo,
       split_part(substring(c."logoUrl" from 1 for 40), ';', 1) AS logo_prefix,  -- напр. data:image/svg+xml
       length(c."logoUrl")                      AS logo_char_length,              -- груб индикатор за размер
       round(length(c."logoUrl") * 3.0 / 4 / 1024, 1) AS approx_kb
FROM "Company" c
LEFT JOIN "Subscription" s ON s."companyId" = c.id
WHERE c.eik = '205516962';

-- 2) Разбивка: колко фирми ползват SVG лого (рискът, който html2canvas не рендираше в PDF).
SELECT split_part(substring("logoUrl" from 1 for 40), ';', 1) AS logo_prefix,
       count(*) AS companies
FROM "Company"
WHERE "logoUrl" IS NOT NULL
GROUP BY 1
ORDER BY companies DESC;
