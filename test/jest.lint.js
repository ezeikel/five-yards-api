const path = require("path");

const ignores = [
  "/node_modules/",
  "/__fixtures__/",
  "/fixtures/",
  "/__tests__/helpers/",
  "/__tests__/utils/",
  "__mocks__",
];

module.exports = {
  rootDir: path.join(__dirname, ".."),
  displayName: "lint",
  runner: "jest-runner-eslint",
  testMatch: ["<rootDir>/**/*.[jt]s"],
  testPathIgnorePatterns: [...ignores],
};
