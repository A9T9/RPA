var webpack = require('webpack');
var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin')
var CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  entry: {
    popup:            './src/index.js',
    content_script:   './src/ext/content_script.js',
    inject:           './src/ext/inject.js',
    background:       './src/ext/bg.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.svg$/,
        loader: 'svg-react-loader',
        exclude: /(node_modules|bower_components)/
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(path.resolve(__dirname, 'dist')),
    new CopyWebpackPlugin([
      {
        from: 'extension/*',
        flatten: true
      }
    ])
  ],
  devtool: 'inline-source-map'
};

if (process.env.NODE_ENV === 'production') {
  delete module.exports.devtool
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    /*
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
        drop_console: true,
        drop_debugger: true
      }
    }),
     */
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
