/**
 * Build script.
 *
 * Usage: node build.js <switches>
 *
 * Switches:
 *   --production: Enables production build (default development).
 *   --clean     : Cleans all build directories.
 *   --clean-app : Cleans CLI app and WASM module build directory.
 *   --clean-lib : Cleans OpenCV and OpenCV.js build directory.
 *   --opencv    : Builds OpenCV if required.
 *   --opencvjs  : Builds OpenCV.js if required.
 *   --cli       : Builds CLI app (also builds OpenCV if required).
 *   --wasm      : Builds WASM module (also builds OpenCV.js if required).
 *   --extension : Builds extension.
 *
 * Example:
 *   node build.js --production --clean --opencv --wasm --extension
 */

const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const fsExtra = require("fs-extra");
const webpack = require("webpack");
const argv = require("minimist")(process.argv.slice(2));

function isBuildFlagSet(flag) {
    return argv && argv[flag];
}

function getBuildMode() {
    return isBuildFlagSet("production") ? "production" : "development";
}

function isWin32() {
    return process.platform === "win32";
}

function fileExists(path) {
    try {
        return fs.statSync(path).isFile();
    } catch (e) {
        if (e.code == "ENOENT") {
            // no such file or directory. File really does not exist
            return false;
        }

        console.log("Exception fs.statSync (" + path + "): " + e);
        throw e; // something else went wrong, we don't have rights, ...
    }
}

function directoryExists(path) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        if (e.code == "ENOENT") {
            // no such file or directory. File really does not exist
            return false;
        }

        console.log("Exception fs.statSync (" + path + "): " + e);
        throw e; // something else went wrong, we don't have rights, ...
    }
}

async function createDirectoryAsync(path) {
    if (!directoryExists(path)) {
        await fsExtra.mkdirs(path);
    }
}

function spawnAsync(cmd, args, options) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, options);
        proc.stdout.on("data", chunk => {
            console.log(chunk.toString());
        });
        proc.stderr.on("data", chunk => {
            console.error(chunk.toString());
        });
        proc.on("error", reject).on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

function copyAsync(source, target) {
    console.log(`Copying: "${source}" --> "${target}"`);
    return new Promise((resolve, reject) => {
        fsExtra.copy(source, target, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function removeAsync(directory) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(directory)) {
            resolve();
            return;
        }

        fsExtra.remove(directory, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function getModuleVersion() {
    // Extract version information from package.json
    const package = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const moduleVersion = package["version"];
    return moduleVersion;
}

async function cleanAppBuildDirectoryAsync() {
    console.log("Cleaning app build directory...");
    await removeAsync("./bin");
    await removeAsync("./build/cli");
    await removeAsync("./build/wasm");
}

async function cleanLibraryBuildDirectoryAsync() {
    console.log("Cleaning library build directory...");
    await removeAsync("./build/opencv");
    await removeAsync("./build/opencvjs");
}

async function createBuildDirectoriesAsync() {
    console.log("Creating build directory...");
    await createDirectoryAsync("./bin");
    await createDirectoryAsync("./bin/cli");
    await createDirectoryAsync("./bin/extension");
    await createDirectoryAsync("./build");
    await createDirectoryAsync("./build/cli");
    await createDirectoryAsync("./build/wasm");
    await createDirectoryAsync("./build/opencv");
    await createDirectoryAsync("./build/opencvjs");
}

function copyHtmlFilesAsync() {
    return copyAsync("./src/html", "./bin/extension");
}

async function copyStaticFilesAsync() {
    await copyAsync("./src/manifest.json", "./bin/extension/manifest.json");
    await copyAsync("./src/img", "./bin/extension/img");
    await copyAsync("./src/js", "./bin/extension/js");
}

function shouldProjectBeRebuilt(artifactRoot, artifactPatterns) {
    if (!directoryExists(artifactRoot)) {
        return true;
    }

    const fileArray = fs.readdirSync(artifactRoot);
    for (const pattern of artifactPatterns) {
        const isRegex = pattern instanceof RegExp;
        const comparer = isRegex ? s => pattern.test(s) : s => pattern === s;

        let matched = false;
        for (const filename of fileArray) {
            if (comparer(filename)) {
                matched = true;
                break;
            }
        }

        if (!matched) {
            return true;
        }
    }

    return false;
}

async function compileOpenCVAsync() {
    const openCVRoot = "./build/opencv";
    const needsRebuild = shouldProjectBeRebuilt(path.join(openCVRoot, "lib"), [
        isWin32() ? /^opencv_core\d+\.lib$/i : "libopencv_core.a"
    ]);

    if (!needsRebuild) {
        console.log("OpenCV looks like already compiled.");
        return;
    }

    const buildDir = path.resolve(__dirname, openCVRoot);
    const buildOptions = {
        cwd: buildDir
    };

    console.log("Compiling OpenCV...");
    const cmakeArgs = [
        "-DBUILD_SHARED_LIBS=OFF",
        "-DBUILD_EXAMPLES=OFF",
        "-DBUILD_opencv_apps=OFF",
        "-DBUILD_DOCS=OFF",
        "-DBUILD_PERF_TESTS=OFF",
        "-DBUILD_TESTS=OFF",
        "-DCMAKE_BUILD_TYPE=Release",
        "-G",
        "Ninja",
        "../../third_party/opencv"
    ];

    await spawnAsync("cmake", cmakeArgs, buildOptions);
    await spawnAsync("ninja", [], buildOptions);
}

async function compileOpenCVJSAsync() {
    const openCVJSRoot = "./build/opencvjs";
    const needsRebuild = shouldProjectBeRebuilt(path.join(openCVJSRoot, "bin"), [
        "opencv.js",
        "opencv_js.js",
        "opencv_js.wasm"
    ]);

    if (!needsRebuild) {
        console.log("OpenCV.js looks like already compiled.");
        return;
    }

    console.log("Compiling OpenCV.js...");
    await spawnAsync("python", ["./third_party/opencv/platforms/js/build_js.py", openCVJSRoot, "--build_wasm"]);
}

async function compileCliAsync() {
    const targetDir = path.resolve(__dirname, "bin/cli");
    const buildDir = path.resolve(__dirname, "build/cli");
    const buildOptions = {
        cwd: buildDir
    };

    const moduleVersion = getModuleVersion();
    const cmakeArgs = [
        `-DKANTUSEARCH_MODULE_VERSION=${moduleVersion}`,
        "-DCMAKE_BUILD_TYPE=Release",
        "-G",
        "Ninja",
        "../../cli/"
    ];

    await spawnAsync("cmake", cmakeArgs, buildOptions);
    await spawnAsync("ninja", [], buildOptions);

    const cliBinary = isWin32() ? "kantusearchcli.exe" : "kantusearchcli";
    await copyAsync(path.resolve(buildDir, cliBinary), path.resolve(targetDir, cliBinary));
}

async function compileWasmAsync() {
    const targetDir = path.resolve(__dirname, "bin/extension/js");
    const buildDir = path.resolve(__dirname, "build/wasm");
    const buildOptions = {
        cwd: buildDir
    };

    const emscriptenPath = process.env.EMSCRIPTEN;
    if (!emscriptenPath || !fsExtra.existsSync(emscriptenPath)) {
        throw new Error("Emscripten path seems uninitialized.");
    }

    const toolchainPath = path.resolve(emscriptenPath, "cmake/Modules/Platform/Emscripten.cmake");
    console.log("Emscripten Path:", emscriptenPath);
    console.log("Emscripten Toolchain:", toolchainPath);

    const moduleVersion = getModuleVersion();
    const cmakeArgs = [
        `-DKANTUSEARCH_MODULE_VERSION=${moduleVersion}`,
        `-DCMAKE_TOOLCHAIN_FILE=${toolchainPath}`,
        "-DCMAKE_BUILD_TYPE=Release",
        "-G",
        "Ninja",
        "../../wasm/"
    ];

    await spawnAsync("cmake", cmakeArgs, buildOptions);
    await spawnAsync("ninja", [], buildOptions);
    await copyAsync(path.resolve(buildDir, "kantusearch.js"), path.resolve(targetDir, "kantusearch.js"));
    await copyAsync(path.resolve(buildDir, "kantusearch.wasm"), path.resolve(targetDir, "kantusearch.wasm"));
}

function compileWithWebpackAsync(entry, bundle) {
    console.log("Compiling: ", entry);
    return new Promise((resolve, reject) => {
        const config = {
            mode: getBuildMode(),
            entry: entry,
            devtool: "source-map",
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        use: "ts-loader",
                        exclude: /node_modules/
                    },
                    {
                        test: /\.scss$/,
                        use: [{ loader: "style-loader" }, { loader: "css-loader" }, { loader: "sass-loader" }]
                    }
                ]
            },
            resolve: {
                extensions: [".tsx", ".ts", ".js"]
            },
            output: {
                filename: bundle,
                path: path.resolve(__dirname, "bin/extension/js")
            }
        };

        const compiler = webpack(config);

        compiler.run((compileError, stats) => {
            if (compileError) {
                reject(compileError);
                return;
            }

            const jsonStats = stats.toJson({
                modules: false,
                chunks: false
            });

            console.info(
                stats.toString({
                    chunks: false,
                    colors: true
                }) + "\n"
            );

            resolve();
        });
    });
}

function compileBackgroundScriptAsync() {
    return compileWithWebpackAsync("./src/ts/background.ts", "background.js");
}

function compileContentScriptAsync() {
    return compileWithWebpackAsync("./src/ts/content-script.ts", "content-script.js");
}

function compileWorkerAsync() {
    return compileWithWebpackAsync("./src/ts/worker-main.ts", "worker-main.js");
}

function compileMainAsync() {
    return compileWithWebpackAsync("./src/ts/main.tsx", "main.js");
}

async function buildAsync() {
    if (isBuildFlagSet("clean")) {
        await cleanAppBuildDirectoryAsync();
        await cleanLibraryBuildDirectoryAsync();
    }

    if (isBuildFlagSet("clean-app")) {
        await cleanAppBuildDirectoryAsync();
    }

    if (isBuildFlagSet("clean-lib")) {
        await cleanLibraryBuildDirectoryAsync();
    }

    if (isBuildFlagSet("extension")) {
        await createBuildDirectoriesAsync();
        await copyHtmlFilesAsync();
        await copyStaticFilesAsync();
    }

    if (isBuildFlagSet("opencv")) {
        await createBuildDirectoriesAsync();
        await compileOpenCVAsync();
    }

    if (isBuildFlagSet("opencvjs")) {
        await createBuildDirectoriesAsync();
        await compileOpenCVJSAsync();
    }

    if (isBuildFlagSet("cli")) {
        await createBuildDirectoriesAsync();
        await compileOpenCVAsync();
        await compileCliAsync();
    }

    if (isBuildFlagSet("wasm")) {
        await createBuildDirectoriesAsync();
        await compileOpenCVJSAsync();
        await compileWasmAsync();
    }

    if (isBuildFlagSet("extension")) {
        await compileBackgroundScriptAsync();
        await compileContentScriptAsync();
        await compileWorkerAsync();
        await compileMainAsync();
    }
}

console.time("build");

buildAsync()
    .then(() => {
        console.timeEnd("build");
    })
    .catch(err => {
        console.error(err);
    });
