<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# i18n — задължителен стандарт (многоезичност)

Платформата има професионална i18n архитектура (`src/lib/i18n`, `src/locales`, `src/components/i18n`). Поддържани езици: **bg (по подразбиране), en, ru, ro, tr, el**. Fallback винаги е bg.

**Правило:** НИКОГА не пишете hardcoded user-facing текст в компонент. Всеки нов текст минава през преводен ключ.

- Client компонент: `const t = useT()` → `t("namespace.key")` (от `@/components/i18n/I18nProvider`). Форматиране: `const { money, date, num } = useI18n()`.
- Server компонент: `const { t } = await getT()` (от `@/lib/i18n/server`). Форматиране: `fmtMoney/fmtDate` от `@/lib/i18n/format`.
- Ключовете живеят в `src/locales/<lang>/<namespace>.json` — еднакви ключове за всички езици.
- Нов namespace = нов JSON за всеки език + ред в `src/lib/i18n/messages.ts`. Нов език = ред в `src/lib/i18n/config.ts` + папка с преводи (без промяна по компонентите).
- НЕ се превеждат: фирмени/лични имена, адреси, потребителски свободен текст, номера на документи, ЕИК/ДДС/IBAN/BIC, банкови данни.
- Документи/PDF/имейли се генерират на езика на документа/получателя (виж `Document.language`, `Company.defaultLanguage`).
- Известия: съхранявайте `notificationKey` + payload, не финален преведен текст.

## PR checklist (i18n)
- [ ] Има ли нови user-facing текстове? Добавени ли са като ключове?
- [ ] Добавени ли са преводите за **bg/en/ru/ro/tr/el**?
- [ ] Няма hardcoded кирилица/латиница в компоненти (освен технически логове/enum кодове).
- [ ] Датите/числата/валутите минават през locale-aware форматирането.
- [ ] Документите/имейлите работят на съответния език.
