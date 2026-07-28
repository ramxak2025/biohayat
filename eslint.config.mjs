import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Скрипты установленного скила impeccable — сторонний код, не наш стиль.
    ".claude/**",
  ]),
  {
    rules: {
      // Чтение localStorage при монтировании (корзина, cookie-баннер) — намеренный
      // приём для безопасной гидрации. Понижаем до предупреждения.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
