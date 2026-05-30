"use strict";
const { config } = require('dotenv');
const { defineConfig, env } = require('@prisma/config');

config();

module.exports = defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
});