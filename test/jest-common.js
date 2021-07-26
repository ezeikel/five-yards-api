const path = require("path");

module.exports = {
  rootDir: path.join(__dirname, ".."),
  testEnvironment: "node",
  moduleDirectories: ["node_modules"],
  coverageDirectory: path.join(__dirname, "../coverage"),
  coveragePathIgnorePatterns: [".*/__tests__/.*"],
  setupFilesAfterEnv: [require.resolve("./setup-env")],
  watchPlugins: ["jest-watch-select-projects", "jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};
