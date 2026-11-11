/** ESLint — TypeScript parse only; avoids workspace eslint-config-next parser resolution issues. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: ["eslint:recommended"],
  ignorePatterns: [".next/**", "node_modules/**", "next-env.d.ts"],
};
