module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    browser: true,
  },
  extends: 'standard',
  plugins: [
    'react'
  ],
  rules: {
    'no-multi-spaces': 'off',
    'key-spacing': 'off',
    'semi': 'off',
    'indent': 'off',
    'no-unused-vars': 'off',
    'camelcase': 'off'
  }
}
