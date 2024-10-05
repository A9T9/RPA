
class BrowserExtensionWebpackPlugin {
  options = {}

  constructor (options) {
    if (!options.createManifestJson) {
      throw new Error('must provide createManifestJson')
    }

    this.options = options
    this.createManifestJson = options.createManifestJson
  }

  apply(compiler) {
    const pluginName = 'BrowserExtensionWebpackPlugin' 

    // webpack module instance can be accessed from the compiler object,
    // this ensures that correct version of the module is used
    // (do not require/import the webpack or any symbols from it directly).
    const { webpack } = compiler;

    // Compilation object gives us reference to some useful constants.
    const { Compilation } = webpack;

    // RawSource is one of the "sources" classes that should be used
    // to represent asset sources in compilation.
    const { RawSource } = webpack.sources;

    // Tapping to the "thisCompilation" hook in order to further tap
    // to the compilation process on an earlier stage.
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      // Tapping to the assets processing pipeline on a specific stage.
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          // Using one of the later asset processing stages to ensure
          // that all assets were already added to the compilation by other plugins.
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {

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
    
          compilation.emitAsset(
            'manifest.json',
            new RawSource(text)
          );
    
          const bgEntry = (this.options || {}).backgroundEntry || 'bg'
          const bgFileName = (this.options || {}).backgroundFileName || 'background.js'
          const codeForImportScript = (scriptPath) => {
            if (process.env.BROWSER === 'firefox') {
              return `try { import('./${scriptPath}'); } catch (e) { console.error('failed to import script ${scriptPath}', e); }`
            } else {
              return `try { importScripts('${scriptPath}'); } catch (e) { console.error('failed to import script ${scriptPath}', e); }`
            }
          }
          const bgCode = getFilesForEntryPoint(bgEntry).map(codeForImportScript).join('\n')    

          compilation.emitAsset(
            bgFileName,
            new RawSource(bgCode)
          );          
        }
      );
    });
  }

}

module.exports = BrowserExtensionWebpackPlugin
