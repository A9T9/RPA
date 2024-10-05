var webpack = require('webpack');
var fs   = require('fs');
var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
var ZipPlugin = require('zip-webpack-plugin')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var BrowserExtensionWebpackPlugin = require('./build/browser_extension_webpack_plugin')
var manifestJson = require('./extension/manifest.json')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
    vision_editor:    './src/vision_editor/index.tsx',
    desktop_screenshot_editor: './src/desktop_screenshot_editor/index.tsx',
    options:          './src/options.ts',
    content_script:   './src/ext/content_script/index.js',
    inject:           './src/ext/inject.js',
    bg:               './src/ext/bg.js'
  },
  output: {
    path: path.join(__dirname, distDir),
    filename: '[name].js'
  },
  optimization: {
    minimizer: [],
    splitChunks: {
      automaticNameDelimiter: '_',
      chunks: chunk => ['content_script', 'inject', 'bg'].indexOf(chunk.name) === -1,
      cacheGroups: {
        reactVendors: {
          name: 'react-essentials',
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          priority: -10
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/, // Handle TypeScript files
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
          }
        }
      },
      {
        test: /\.(js|jsx)$/, // Handle JavaScript files
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "postcss-loader",
          {
            loader: "sass-loader",
            options: { implementation: require("sass") },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              // insertAt: 'top'
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
    extensions: ['.tsx', '.ts', '.js', '.json'],
    alias: {
      '@': path.join(__dirname, 'src'),
      '$': __dirname
    },
    fallback: {
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
      'process/browser': require.resolve('process/browser')
    }
  },
  plugins: [
    // new BundleAnalyzerPlugin(), // uncomment and run build to see bundle size
    new webpack.ProvidePlugin({
      process: 'process/browser'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'extension', 
          globOptions: {
            ignore: ['**/*.html', '**/manifest.json']
          },
        },
      ],
    }),
    new HtmlWebpackPlugin({
      chunks: ['popup'],
      template: './extension/popup.html',
      filename: 'popup.html'
    }),
    new HtmlWebpackPlugin({
      chunks: ['popup'],
      template: './extension/sidepanel.html',
      filename: 'sidepanel.html'
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
    new HtmlWebpackPlugin({
      chunks: ['desktop_screenshot_editor'],
      template: './extension/desktop_screenshot_editor.html',
      filename: 'desktop_screenshot_editor.html'
    }),
    new HtmlWebpackPlugin({
      chunks: ['options'],
      template: './extension/options.html',
      filename: 'options.html'
    }),
    new BrowserExtensionWebpackPlugin({
      backgroundEntry: 'bg',
      backgroundFileName: 'background.js',
      createManifestJson: ({ getFilesForEntryPoint }) => {
        if (process.env.BROWSER === 'firefox') {
          manifestJson['permissions'] = manifestJson['permissions'].filter(p => {
            return [
              'pageCapture', 'debugger', 'webNavigation', 'management', 'downloads.shelf'
            ].indexOf(p) === -1
          })

          manifestJson['browser_specific_settings'] = {
            gecko: {
				id: 'kantu@a9t9.com',
				strict_min_version: '115.0'			
            }
          }

          if (manifestJson['options_page']) {
            manifestJson['options_ui'] = {
              page: manifestJson['options_page']
            }
          }

          if (manifestJson['background']['service_worker']) {
            manifestJson['background']['scripts'] = [ manifestJson['background']['service_worker'] ]
            delete manifestJson['background']['service_worker']
          }

          if (manifestJson['side_panel']) {
            manifestJson['sidebar_action'] = {
              default_title: '__MSG_name__',
              default_panel: manifestJson['side_panel']['default_path'],
              default_icon: manifestJson['icons']['128'],
              open_at_install: false
            }
            delete manifestJson['side_panel']
          }

          delete manifestJson['offline_enabled']
          delete manifestJson['options_page']    
          
          // remove  sidePanel from permissions
          manifestJson['permissions'] = manifestJson['permissions'].filter(p => {
            return p !== 'sidePanel'
          })     
        }

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

if (process.env.BROWSER !== 'firefox') { 
  // idb.filesystem.js cannot be used (nor needed) in service worker in Chrome or Edge
  module.exports.plugins = (module.exports.plugins || []).concat([
      new webpack.NormalModuleReplacementPlugin(
      /idb.filesystem.js/,
      './empty_module.js'
    )
  ])
}

if (process.env.NODE_ENV === 'production') {
  delete module.exports.devtool

  // Note: Firefox AMO doesn't allow file size larger than 4mb, so have to minimize it
  // For Chrome, minified code runs slower than before, so keep it as not minified
  if (process.env.BROWSER === 'firefox') {
    delete module.exports.optimization.minimizer
  }

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
