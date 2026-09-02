const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const colors = require("colors");

(async function () {

    colors.enable();
    console.log(colors.bold("[STEP 1/4]:".bgMagenta) + " Compiling Rust-code into Web Assembly.");

    const projectRootDirectory = path.join(__dirname, "../");

    const wasmSourceDirectory = path.join(projectRootDirectory, "lib"),
        distSourceDirectory = path.join(projectRootDirectory, "dist");

    if (!fs.existsSync(wasmSourceDirectory))
        return console.log(colors.bold("[ERROR]: ".red) + `Could not build wasm because the source directory could not be located.`);

    if (!fs.existsSync(distSourceDirectory))
        fs.mkdirSync(distSourceDirectory);

    function getBranchName() {
        try {
            return cp.execSync("git rev-parse --abbrev-ref HEAD", { cwd: projectRootDirectory })
                .toString()
                .trim()
                .replace(/[^a-zA-Z0-9.-]+/g, "-");
        } catch (err) {
            return "unknown-branch";
        }
    }

    function getTimestamp() {
        const now = new Date();

        const pad = (n) => String(n).padStart(2, "0");

        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    }

    async function internalThread() {
        return new Promise(function (resolve, reject) {
            cp.exec(`wasm-pack.exe build "${wasmSourceDirectory}" --target no-modules --out-dir "${distSourceDirectory}" --out-name fluexgl-dsp-wasm`, function (err, stdout, stderr) {
                stdout && console.log(colors.bold("[INFO]:".yellow) + stdout);
                stderr && console.log(colors.bold("[INFO]:".yellow) + stderr);
            }).on("close", function () {
                resolve();
            }).on("error", function(err) {
                reject(err);
            });
        });
    }

    await internalThread();

    const branchName = getBranchName(),
        timestamp = getTimestamp();

    const versionDirectory = path.join(distSourceDirectory, "archive", `${branchName}-${timestamp}`);

    fs.mkdirSync(versionDirectory, { recursive: true });

    const archivedFileNames = [
        "fluexgl-dsp-wasm.js",
        "fluexgl-dsp-wasm.d.ts",
        "fluexgl-dsp-wasm_bg.wasm",
        "fluexgl-dsp-wasm_bg.wasm.d.ts",
    ];

    for (const fileName of archivedFileNames) {
        const sourceFilePath = path.join(distSourceDirectory, fileName),
            archivedFilePath = path.join(versionDirectory, fileName);

        if (fs.existsSync(sourceFilePath))
            fs.copyFileSync(sourceFilePath, archivedFilePath);
    }

    console.log(colors.bold("[INFO]: ".yellow) + `Archived a versioned copy of the build output under ${versionDirectory}.`);
    console.log(colors.bold("[SUCCESS]: ".green) + "Attempt to build was has succeed. See log above for building details.");
})();