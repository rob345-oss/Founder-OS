/** ESLint — TypeScript + react-hooks; avoids workspace eslint-config-next parser resolution issues. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/incompatible-library": "off",
    "react-hooks/refs": "off",
  },
  ignorePatterns: [".next/**", "node_modules/**", "next-env.d.ts"],
  globals: {
    React: "readonly",
    HeadersInit: "readonly",
    RequestInit: "readonly",
    BodyInit: "readonly",
  },
};