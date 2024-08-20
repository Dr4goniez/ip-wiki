import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticJs from '@stylistic/eslint-plugin-js';

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic/js': stylisticJs
    },
    ignores: ["docs/*"],
    languageOptions: {
      ecmaVersion: 6,
      sourceType: "script"
    },
    rules: {
      semi: "error",
      "@stylistic/js/no-extra-semi": "error",
      "default-param-last": "warn",
      "no-undef": [
        "off",
        {"module": true}
      ],
      "@typescript-eslint/no-require-imports": "off",
    }
  }
];