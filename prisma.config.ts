import { config } from 'dotenv';
import { defineConfig, env } from '@prisma/config';

config();

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
});
