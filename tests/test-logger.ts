// Simple logger for tests
/* eslint-disable no-console */
export const logger = {
  currentTest: '',

  setCurrentTest(test: string) {
    this.currentTest = test;
  },

  info(message: string, ...args: any[]) {
    console.log(`[INFO] ${this.currentTest ? `[${this.currentTest}] ` : ''}${message}`, ...args);
  },

  debug(message: string, ...args: any[]) {
    if (process.env.DEBUG_TESTS) {
      console.log(`[DEBUG] ${this.currentTest ? `[${this.currentTest}] ` : ''}${message}`, ...args);
    }
  },

  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${this.currentTest ? `[${this.currentTest}] ` : ''}${message}`, ...args);
  },

  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${this.currentTest ? `[${this.currentTest}] ` : ''}${message}`, ...args);
  },

  dockerProgress(message: string) {
    if (process.env.DEBUG_TESTS) {
      console.log(`[DOCKER] ${message.replace(/\n$/, '')}`);
    }
  },
};
