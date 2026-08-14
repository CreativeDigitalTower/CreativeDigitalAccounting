/**
 * Начална master data за клиента (ЕИК 109581515) — САМО потвърдените от реалните
 * данни стойности. Използва се ЕДИНСТВЕНО от idempotent seed-а; НЕ е runtime логика.
 * Нищо не е измислено: непотвърдените съкратени номера и material codes са изключени.
 */

// 21 потвърдени пълни регистрационни номера.
export const SEED_VEHICLE_REGISTRATIONS: string[] = [
  "CB0638AT", "CB6215AH", "CB1522CK", "CB8055CK", "CB8296HE", "CB1639AH", "CB0639AT",
  "ST9838AC", "SK581TO", "CB5038BB", "ST1344AD", "ST8344AC", "SK3362AB", "SK498SL",
  "ST8669AE", "KH4788KB", "KH8165KA", "SK5189BA", "SK3832BO", "SK501TO", "KP4240AC",
];

// Потвърдени съкратени → пълен номер (стари Excel записи). Пазят се като aliases,
// за да може историческият import да се разпознае към същия автомобил.
export const SEED_VEHICLE_ALIASES: Record<string, string> = {
  CB0638: "CB0638AT", CB6215: "CB6215AH", CB1522: "CB1522CK", CB8296: "CB8296HE",
  CB1639: "CB1639AH", CB0639: "CB0639AT", CB5038: "CB5038BB", ST9838: "ST9838AC",
  SK581: "SK581TO", ST1344: "ST1344AD", ST8344: "ST8344AC", SK3362: "SK3362AB",
  SK498: "SK498SL", ST8669: "ST8669AE", KH4788: "KH4788KB", KH8165: "KH8165KA",
  SK5189: "SK5189BA", SK3832: "SK3832BO", SK501: "SK501TO", KP4240: "KP4240AC",
};

// Непотвърдени съкратени номера — БЕЗ сигурен пълен номер. НЕ се seed-ват като
// канонични автомобили. Пазим ги само като справка за бъдещо ръчно свързване.
export const UNRESOLVED_VEHICLE_SHORTCODES: string[] = [
  "SK7331", "SK832", "SK9891", "SK7503", "ST2899", "ST7344", "SK6539", "CB7765",
];

export type SeedProduct = {
  canonicalName: string;
  aliases: string[];
  unit: string;
  packaging: string | null;
  materialCode: string | null; // само потвърдените; иначе null
};

// 4 продукта. Material codes само за потвърдените (42.5 R → 14008014, 52.5 N → 14012840).
export const SEED_PRODUCTS: SeedProduct[] = [
  {
    canonicalName: "CEM II A-LL 42.5 R",
    aliases: ["CEM II 42,5 R", "CEM II 42.5 R", "CEM II A-LL 42,5 R"],
    unit: "t", packaging: null, materialCode: "14008014",
  },
  {
    canonicalName: "CEM II A-LL 52.5 N",
    aliases: ["A-LL 52,5 N", "A-LL 52.5 N", "CEM II A-LL 52,5 N"],
    unit: "t", packaging: null, materialCode: "14012840",
  },
  {
    canonicalName: "CEM II B-V 52.5 N",
    aliases: ["CEM II B-V 52,5 N", "B-V 52,5 N", "B-V 52.5 N"],
    unit: "t", packaging: null, materialCode: null,
  },
  {
    canonicalName: "CEM II B-LL 42.5 R",
    aliases: ["B-LL 42,5 R", "B-LL 42.5 R", "CEM II B-LL 42,5 R"],
    unit: "t", packaging: "25 kg bags", materialCode: null,
  },
];
