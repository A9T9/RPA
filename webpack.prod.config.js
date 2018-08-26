var webpack = require('webpack');
var fs   = require('fs');
var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin')
var CleanWebpackPlugin = require('clean-webpack-plugin')
var ZipPlugin = require('zip-webpack-plugin')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var HtmlWebpackIncludeSiblingChunksPlugin = require('html-webpack-include-sibling-chunks-plugin')
var BrowserExtensionWebpackPlugin = require('./build/browser_extension_webpack_plugin')
var manifestJson = require('./extension/manifest.json')

var distDir = (function () {
  switch (process.env.BROWSER) {
    case 'firefox':   return 'dist_ff'
    default:          return 'dist'
  }
})()

module.exports = {
  entry: {
    popup:            './src/index.js',
    csv_editor:       './src/csv_editor.js',
    vision_editor:    './src/vision_editor.js',
    content_script:   './src/ext/content_script/index.js',
    inject:           './src/ext/inject.js',
    background:       './src/ext/bg.js'
  },
  output: {
    path: path.join(__dirname, distDir),
    filename: '[name].js'
  },
  optimization: {
    minimizer: [],
    splitChunks: {
      automaticNameDelimiter: '_',
      chunks: chunk => ['content_script', 'inject'].indexOf(chunk.name) === -1,
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /node_modules/,
          priority: -10
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              insertAt: 'top'
            }
          },
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.svg$/,
        loader: 'svg-react-loader',
        exclude: /(node_modules|bower_components)/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new CleanWebpackPlugin(path.resolve(__dirname, distDir)),
    new CopyWebpackPlugin([
      { from: 'extension' },
      'imagesearch-testextension/bin/js/kantusearch.js',
      'imagesearch-testextension/bin/js/kantusearch.wasm',
      'imagesearch-testextension/bin/js/worker-main.js',
      'imagesearch-testextension/bin/js/worker.js'
    ]),
    new HtmlWebpackIncludeSiblingChunksPlugin(),
    new HtmlWebpackPlugin({
      chunks: ['popup'],
      template: './extension/popup.html',
      filename: 'popup.html'
    }),
    new HtmlWebpackPlugin({
      chunks: ['csv_editor'],
      template: './extension/csv_editor.html',
      filename: 'csv_editor.html'
    }),
    new HtmlWebpackPlugin({
      chunks: ['vision_editor'],
      template: './extension/vision_editor.html',
      filename: 'vision_editor.html'
    }),
    new BrowserExtensionWebpackPlugin({
      createManifestJson: ({ getFilesForEntryPoint }) => {
        if (process.env.BROWSER === 'firefox') {
          delete manifestJson['background']['persistent']
          delete manifestJson['offline_enabled']

          manifestJson['permissions'] = manifestJson['permissions'].filter(p => {
            return [
              'pageCapture', 'debugger', 'proxy',
              'webNavigation', 'webRequest', 'webRequestBlocking',
              'nativeMessaging', 'contextMenus', 'management'
            ].indexOf(p) === -1
          })
        }

        manifestJson['background']['scripts']     = getFilesForEntryPoint('background')
        manifestJson['content_scripts'][0]['js']  = getFilesForEntryPoint('content_script')

        return manifestJson
      }
    }),
    new webpack.DefinePlugin({
      'PREINSTALL_CSV_LIST': (function () {
        return JSON.stringify(
          fs.readdirSync(path.join('extension', 'preinstall', 'csv'))
          .map(fileName => `preinstall/csv/${fileName}`)
        )
      })(),
      'PREINSTALL_VISION_LIST': (function () {
        return JSON.stringify(
          fs.readdirSync(path.join('extension', 'preinstall', 'vision'))
          .map(fileName => `preinstall/vision/${fileName}`)
        )
      })()
    })
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
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new ZipPlugin({
      path: '..',
      filename: `${process.env.BROWSER || 'unknown'}_ext.zip`
    })
  ])
}
