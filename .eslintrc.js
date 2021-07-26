module.exports = {
  parser: "@typescript-eslint/parser", // specifies ESLint parser
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2020, // allows for the parsing of modern ECMAScript features
    sourceType: "module", // allows for the use of imports
  },
  extends: [
    "plugin:@typescript-eslint/recommended", // uses the recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:prettier/recommended",
  ],
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
