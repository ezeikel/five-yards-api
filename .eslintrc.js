module.exports = {
  parserOptions: {
    ecmaVersion: 2020, // allows for the parsing of modern ECMAScript features
    sourceType: "module", // allows for the use of imports
  },
  extends: ["eslint:recommended", "eslint-config-prettier"],
  env: {
    node: true,
    mongo: true,
    jest: true,
  },
  rules: {
    "valid-typeof": "error",
  },
  overrides: [
    {
      files: "**/*.+(ts|tsx)",
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      plugins: ["@typescript-eslint/eslint-plugin"],
      extends: ["plugin:@typescript-eslint/eslint-recommended", "plugin:@typescript-eslint/recommended"],
    },
    {
      files: ["**/__tests__/**"],
      settings: {
        "import/resolver": {
          jest: {
            jestConfigFile: "./test/jest-config.js",
          },
        },
      },
    },
  ],
};
