/**
 * Безопасна сериализация на JSON-LD за вграждане в <script type="application/ld+json">.
 * Екранира символите, с които може да се „избяга" от script тага (напр. </script>
 * в потребителско/админ съдържание), предотвратявайки XSS през структурираните данни.
 * Екранираме и U+2028 / U+2029, които са невалидни в JS низове.
 */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LS).join("\\u2028")
    .split(PS).join("\\u2029");
}
