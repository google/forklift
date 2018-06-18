module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: {
    browser: true,
  },
  extends: [
    "eslint:recommended",
    "google",
    "plugin:vue/recommended",
  ],
  plugins: [
    "prettier"
  ],
  // add your custom rules here
  'rules': {
    'indent': [2, 2],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'prettier/prettier': 'error',
    'sort-imports': 'error'
  }
}
