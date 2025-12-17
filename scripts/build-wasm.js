const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const colors = require("colors");

(async function () {

    colors.enable();

    const projectRootDirectory = path.join(__dirname, "../");

    const wasmSourceDirectory = path.join(projectRootDirectory, "lib");
    const distSourceDirectory = path.join(projectRootDirectory, "_dist");

    if (!fs.existsSync(wasmSourceDirectory) || !fs.existsSync(distSourceDirectory))
        return console.log(console.bold("[ERROR]: ".red) + `Could not build wasm because the source directory could not be located.`);


    async function internalThread() {
        return new Promise(function (resolve, reject) {
            cp.exec(`wasm-pack.exe build ${wasmSourceDirectory} --target no-modules --out-dir ${distSourceDirectory} --out-name fluexgl-dsp-wasm`, function(err, stdout, stderr) {
                stdout && console.log(colors.bold("[INFO]:".yellow) + stdout);
                stderr && console.log(colors.bold("[INFO]:".yellow) + stderr);
            }).on("close", function() {
                resolve();
            })
        });
    }


    await internalThread();

    console.log(colors.bold("[SUCCESS]: ".green) + "Attempt to build was has succeed. See log above for building details.");
})();