module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: [
    "**/__tests__/**/*.(spec|test).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  moduleNameMapper: {
    "^@workflows-lib/(.*)$": "workflows-lib/src/$1",
    "^@relay-workflows-lib/(.*)$": "relay-workflows-lib/src/$1",
  },
};
