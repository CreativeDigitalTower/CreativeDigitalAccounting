"use client";
import { useRef, useEffect, useState } from "react";

/**
 * Лек WYSIWYG редактор (като Word) върху contentEditable.
 * Поддържа: удебеляване, курсив, подчертаване, заглавия, списъци, цитат,
 * линкове, снимки (качване/URL), подравняване и изчистване на форматирането.
 * Връща HTML чрез onChange.
 */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);

  // зареждаме съдържанието еднократно (за да не мести курсора при всеки render)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() { if (ref.current) onChange(ref.current.innerHTML); }

  function cmd(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
    force((n) => n + 1);
  }

  function addLink() {
    const url = prompt("URL на линка:", "https://");
    if (url) cmd("createLink", url);
  }

  async function addImage() {
    const choice = confirm("OK = качи снимка от компютъра\nОтказ = постави URL на снимка");
    if (choice) {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) return;
        if (file.size > 3 * 1024 * 1024) { alert("Снимката трябва да е под 3MB."); return; }
        const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
        cmd("insertHTML", `<img src="${dataUrl}" alt="" style="max-width:100%;border-radius:10px;margin:12px 0" />`);
      };
      input.click();
    } else {
      const url = prompt("URL на снимката:", "https://");
      if (url) cmd("insertHTML", `<img src="${url}" alt="" style="max-width:100%;border-radius:10px;margin:12px 0" />`);
    }
  }

  const Btn = ({ on, label, title }: { on: () => void; label: React.ReactNode; title: string }) => (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={on}
      style={{ minWidth: 30, height: 30, border: "1px solid var(--border)", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 7px" }}>
      {label}
    </button>
  );
  const sep = <span style={{ width: 1, background: "var(--border)", margin: "0 2px" }} />;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 8, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,.6)", position: "sticky", top: 0, zIndex: 2 }}>
        <Btn on={() => cmd("formatBlock", "H2")} label="H2" title="Заглавие 2" />
        <Btn on={() => cmd("formatBlock", "H3")} label="H3" title="Заглавие 3" />
        <Btn on={() => cmd("formatBlock", "P")} label="¶" title="Нормален текст" />
        {sep}
        <Btn on={() => cmd("bold")} label={<b>Б</b>} title="Удебелен" />
        <Btn on={() => cmd("italic")} label={<i>К</i>} title="Курсив" />
        <Btn on={() => cmd("underline")} label={<u>П</u>} title="Подчертан" />
        <Btn on={() => cmd("strikeThrough")} label={<s>З</s>} title="Зачертан" />
        {sep}
        <Btn on={() => cmd("insertUnorderedList")} label="•" title="Точков списък" />
        <Btn on={() => cmd("insertOrderedList")} label="1." title="Номериран списък" />
        <Btn on={() => cmd("formatBlock", "BLOCKQUOTE")} label="❝" title="Цитат" />
        {sep}
        <Btn on={() => cmd("justifyLeft")} label="⬅" title="Ляво" />
        <Btn on={() => cmd("justifyCenter")} label="⬌" title="Центрирано" />
        <Btn on={() => cmd("justifyRight")} label="➡" title="Дясно" />
        {sep}
        <Btn on={addLink} label="🔗" title="Линк" />
        <Btn on={addImage} label="🖼" title="Снимка" />
        {sep}
        <Btn on={() => cmd("removeFormat")} label="✕" title="Изчисти форматирането" />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="blog-content rte-area"
        style={{ minHeight: 320, padding: "16px 18px", fontSize: 15.5, lineHeight: 1.7, outline: "none" }}
      />
      <style>{`
        .rte-area:empty:before { content: "Започнете да пишете тук…"; color: var(--muted); }
        .rte-area img { max-width: 100%; border-radius: 10px; }
        .rte-area h2 { font-family: 'Fraunces', serif; font-size: 22px; margin: 18px 0 8px; }
        .rte-area h3 { font-family: 'Fraunces', serif; font-size: 18px; margin: 14px 0 6px; }
        .rte-area blockquote { border-left: 3px solid var(--emerald); margin: 12px 0; padding: 6px 14px; color: var(--ink-soft); background: rgba(15,138,106,.05); border-radius: 6px; }
        .rte-area ul, .rte-area ol { padding-left: 22px; margin: 8px 0; }
      `}</style>
    </div>
  );
}
