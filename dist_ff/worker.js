/**
 * WebAssembly supported web worker bootstrapper
 */

var moduleStartTime = performance.now();

function getNamespaceMembers(module, namespace) {
    const ns = {};
    const dotPrefix = namespace + ".";
    const dollarPrefix = namespace + "$";
    const nameOffset = namespace.length + 1;
    const fullNameArray = Object.keys(module).filter(x => x.startsWith(dotPrefix) || x.startsWith(dollarPrefix));
    for (const fullName of fullNameArray) {
        const name = fullName.substr(nameOffset);
        ns[name] = module[fullName];
    }

    return ns;
}

function notifyModuleInitialized() {
    const elapsedTime = performance.now() - moduleStartTime;
    console.log(`Module is initialized in ${elapsedTime.toFixed(0)} ms`);
    self.postMessage({
        type: 0 /* WorkerMessageType.Init */,
        data: {
            moduleVersion: teamdocs.getModuleVersion()
        }
    });
}

/**
 * Global module object which will be merged with WebAssembly module.
 */
var Module = {
    onRuntimeInitialized: () => {},

    postRun: [
        () => {
            // Emscripten generates flat names for exports with namespaces.
            // We'll build an object tree from those flat names and
            // merge into global object (since we're in web worker, global object is "self").
            self.teamdocs = getNamespaceMembers(Module, "teamdocs");

            notifyModuleInitialized();
        }
    ]
};

importScripts("teamdocs.js", "worker-main.js");
