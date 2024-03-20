import { withCucumber } from '@linkare/vitest-cucumberjs/config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

let retVal;

if (process.env.E2E === 'true') {
  // https://vitejs.dev/config/
  retVal = withCucumber(
    {
      glueCode: [
        'features/step_definitions/*.(test|spec).ts'
      ],
      features: ['features/**/*.feature'],
    },
    {
      plugins: [
        react()
      ],
      test: {
        globals: false,
        environment: 'jsdom',
        coverage: {
          reporter: ['text', 'html']
        },
        reporters: [
          'verbose',
          ['junit', { outputFile: 'dist/junit-e2e.xml', suiteName: 'JUnit Suite for project X' }],
        ],
        fileParallelism: false,
      },
      define: {
        'import.meta.vitest': 'undefined'
      }
    }
  );
}
else {
  retVal = defineConfig({
    plugins: [
      react()
    ],
    test: {
      include: ['src/**/*.(spec|test).ts'],
      globals: false,
      environment: 'jsdom',
      coverage: {
        reporter: ['text', 'html']
      },
      reporters: [
        'verbose',
        ['junit', { outputFile: 'dist/junit-unit.xml', suiteName: 'JUnit Suite for project X' }],
      ],
      fileParallelism: false,
    },
    define: {
      'import.meta.vitest': 'undefined'
    }
  });
}

export default retVal;



