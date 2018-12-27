module.exports = process.env.NODE_ENV === 'development' ? {
  plugins: [
    '@babel/plugin-syntax-dynamic-import',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-class-properties'
  ]
} : {
  presets: [
    '@vue/app'
  ]
}
