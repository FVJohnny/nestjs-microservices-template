import eslintConfig from '@libs/nestjs-eslint';

export default [
  ...eslintConfig,
  {
    files: ["src/**/*.ts"]
  }
];