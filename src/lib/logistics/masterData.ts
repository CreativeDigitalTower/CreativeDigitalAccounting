/**
 * Начална master data за клиента (ЕИК 109581515) — САМО потвърдените от реалните
 * данни стойности. Използва се ЕДИНСТВЕНО от idempotent seed-а; НЕ е runtime логика.
 * Нищо не е измислено: непотвърдените съкратени номера и material codes са изключени.
 */

// 21 потвърдени пълни регистрационни номера (Phase 2).
export const SEED_VEHICLE_REGISTRATIONS: string[] = [
  "CB0638AT", "CB6215AH", "CB1522CK", "CB8055CK", "CB8296HE", "CB1639AH", "CB0639AT",
  "ST9838AC", "SK581TO", "CB5038BB", "ST1344AD", "ST8344AC", "SK3362AB", "SK498SL",
  "ST8669AE", "KH4788KB", "KH8165KA", "SK5189BA", "SK3832BO", "SK501TO", "KP4240AC",
];

// Камион / ремарке комбинации от SK501.xlsx (Sheet22). Първата рег. = камион, втората
// = ремарке. defaultTrailer се записва във VehicleLogisticsProfile.trailerReg.
export type SeedTruck = { truck: string; trailer: string };
export const SEED_TRUCK_TRAILERS: SeedTruck[] = [
  { truck: "SK2562AB", trailer: "SK838TR" }, { truck: "SK2562AB", trailer: "SK795SV" },
  { truck: "SK349TF", trailer: "SK1986AB" }, { truck: "SK3362AB", trailer: "SK939TH" },
  { truck: "SK498SL", trailer: "SK5020AE" }, { truck: "SK501TO", trailer: "SK5022AE" },
  { truck: "SK581TO", trailer: "SK728SV" }, { truck: "SK583VR", trailer: "SK1984AB" },
  { truck: "SK6539AO", trailer: "SK891TR" }, { truck: "SK7331AU", trailer: "SK842SV" },
  { truck: "SK7503BV", trailer: "SK1986AB" }, { truck: "SK832UU", trailer: "SK5021AE" },
  { truck: "SK987RN", trailer: "SK842SV" },
];

// Потвърдени съкратени → пълен номер (стари Excel записи). SK501.xlsx РЕШИ 4 от
// непотвърдените (SK6539→SK6539AO, SK7331→SK7331AU, SK7503→SK7503BV, SK832→SK832UU).
export const SEED_VEHICLE_ALIASES: Record<string, string> = {
  CB0638: "CB0638AT", CB6215: "CB6215AH", CB1522: "CB1522CK", CB8296: "CB8296HE",
  CB1639: "CB1639AH", CB0639: "CB0639AT", CB5038: "CB5038BB", ST9838: "ST9838AC",
  SK581: "SK581TO", ST1344: "ST1344AD", ST8344: "ST8344AC", SK3362: "SK3362AB",
  SK498: "SK498SL", ST8669: "ST8669AE", KH4788: "KH4788KB", KH8165: "KH8165KA",
  SK5189: "SK5189BA", SK3832: "SK3832BO", SK501: "SK501TO", KP4240: "KP4240AC",
  SK6539: "SK6539AO", SK7331: "SK7331AU", SK7503: "SK7503BV", SK832: "SK832UU",
};

// Все още непотвърдени съкратени номера (SK501.xlsx реши 4 от предишните 8).
export const UNRESOLVED_VEHICLE_SHORTCODES: string[] = ["SK9891", "ST2899", "ST7344", "CB7765"];

// Дестинации (Sheet22, колона D) — FCA градове в Македония. Route master data.
export const SEED_DESTINATIONS: string[] = ["Скопие", "Кочани", "Ранковце", "Кр. Паланка", "Куманово"];

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
  // ── Нови от SK501.xlsx (Sheet22) — без дубликати; кирилски alias за А-LL 52,5 N ──
  { canonicalName: "CEM I 52.5 R", aliases: ["CEM I 52,5 R"], unit: "t", packaging: null, materialCode: null },
  { canonicalName: "CEM I 52.5 N", aliases: ["CEM I 52,5 N"], unit: "t", packaging: null, materialCode: null },
  { canonicalName: "DEGASET", aliases: [], unit: "t", packaging: null, materialCode: null },
  { canonicalName: "CEM IV B(V) 42.5 N", aliases: ["CEM IV / B(V) 42,5 N", "CEM IV B(V) 42,5 N"], unit: "t", packaging: null, materialCode: null },
];

// Допълнителни aliases към СЪЩЕСТВУВАЩИ продукти (Cyrillic „А", запетая, „/") — за да
// не се създава дубликат при въвеждане на формата от SK501.xlsx.
export const SEED_PRODUCT_EXTRA_ALIASES: { canonicalName: string; aliases: string[] }[] = [
  { canonicalName: "CEM II A-LL 52.5 N", aliases: ["CEM II / А-LL 52,5 N", "CEM II / A-LL 52,5 N"] }, // кирилско А
  { canonicalName: "CEM II B-LL 42.5 R", aliases: ["CEM II / B-LL 42,5 R"] },
  { canonicalName: "CEM II A-LL 42.5 R", aliases: ["CEM II/A-LL 42,5 R"] },
];
