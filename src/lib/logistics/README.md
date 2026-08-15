# Модул „Търговия, доставки и логистика"

Индивидуално активиран модул (ЕИК 109581515 + свързаната MK фирма). Достъпът е
database-driven (`CompanyModuleAccess`), без hardcode на ЕИК в runtime. Активира се от
Super Admin → Модули.

## Workflow (enter once → use everywhere)

```
Проформа (договорено к-во)
  → Holcim експедиционна бележка → Shipment (курс, TR-YYYY-000001)
    → Holcim фактура (line-level, matching по бележка) → покупна цена/себестойност
    → Транспорт (етапи + закъснения) + документи (типизирани) + досие на вноса
    → Вносни разходи (Македония) + 18% ДДВ → себестойност
  → BG→MK фактура (един споделен документ: BG издал / MK получил)
    → MK inventory (получено/продадено/остатък)
      → MK продажба към клиент (Serializable, без double-selling)
        → плащане/аналитика (оборот/тонове/марж, top клиенти, сравнение периоди)
```

Traceability е двупосочна навсякъде: MK продажба → BG→MK → курс → Holcim → бележка → проформа.

## Ключови гаранции

- **Concurrency-safe номерация** — `NumberSequence` (Postgres `INSERT … ON CONFLICT DO
  UPDATE … RETURNING`) за Shipment / BG→MK / MK номера. Виж `sequence.ts`.
- **Без double-selling** — MK продажбата тегли от inventory в `$transaction`
  (`Serializable`) с re-check на остатъка. Виж `inventory.ts`, `mk-sales/route.ts`.
- **Уникалност** — една експедиционна бележка → 1 supplier invoice line; един курс →
  1 BG→MK ред (unique `shipmentId`); фактура/курс не два пъти.
- **Decimal-safe пари** — `money.ts` (Prisma.Decimal), per-line закръгляне.
- **Snapshots за историческа коректност** — продукт/автомобил/превозвач/курс/ставка.
- **Права по роля** — `perms.ts` (view/manage_shipments/documents/invoices/rates/
  historical/analytics); Super Admin → пълен достъп.
- **Агрегати от операциите** — досиета и аналитика се смятат от данните, не се пазят
  ръчно (`dossier.ts`, `analytics.ts`). Само pre-system историческите данни са ръчни.

## Чисти (тествани) helper-и

`normalize`, `sequence`, `perms/access`, `shipmentCalc`, `purchaseCalc`, `money`,
`invoiceMatch`, `transport`, `costCalc`, `inventory`, `dossier`, `analytics`.
Приемни тестове (раздел 88, Test 1–7): `__tests__/logisticsIntegration.test.ts`.
