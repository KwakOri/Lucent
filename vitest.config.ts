import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // .env.test 파일 로드
  const env = loadEnv('test', process.cwd(), '');

  return {
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['**/*.test.ts', '**/*.spec.ts'],
      exclude: ['node_modules', '.next', 'out'],
      env,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          '.next/',
          'tests/',
          '**/*.config.ts',
          '**/*.d.ts',
          'types/',
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});
