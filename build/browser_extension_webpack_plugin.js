
class BrowserExtensionWebpackPlugin {
  constructor (options) {
    if (!options.createManifestJson) {
      throw new Error('must provide createManifestJson')
    }

    this.createManifestJson = options.createManifestJson
  }

  apply (compiler) {
    compiler.hooks.emit.tap('BrowserExtensionWebpackPlugin', (compilation) => {
      const entryPointNames       = Array.from(compilation.entrypoints.keys())
      const getFilesForEntryPoint = (name) => {
        if (entryPointNames.indexOf(name) === -1) {
          throw new Error(`Entry point "${name}" doesn't exist`)
        }
        const entryPoint = compilation.entrypoints.get(name)
        return entryPoint.getFiles()
      }
      const manifestJson  = this.createManifestJson({ entryPointNames, getFilesForEntryPoint })
      const text          = JSON.stringify(manifestJson, null, 2)

      compilation.assets['manifest.json'] = {
        source: function () {
          return text
        },
        size: function () {
          return text.length
        }
      }
    })
  }
}

module.exports = BrowserExtensionWebpackPlugin
