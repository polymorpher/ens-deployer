// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'standard',
    'plugin:node/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true
  },
  rules: {
    'node/no-unsupported-features/es-syntax': [
      'error',
      { ignores: ['modules'] }
    ],
    'node/no-extraneous-import': 0,
    'node/no-unpublished-import': 0,
    'node/no-missing-import': ['error', {
      tryExtensions: ['.js', '.json', '.node', '.ts']
    }]
  }
}
