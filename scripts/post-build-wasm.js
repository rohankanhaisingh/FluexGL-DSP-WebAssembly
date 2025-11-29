const fs = require("fs");
const path = require("path");
const colors = require("colors");
const cp = require("child_process");

(async function () {

    colors.enable();

    const projectRootDirectory = path.join(__dirname, "../"),
        projectDistDirectory = path.join(projectRootDirectory, "_dist");

    if (!fs.existsSync(projectDistDirectory))
        return console.error("[ERROR]: " + "Could not post build wasm, because the _dist directory could not be located.");

    const distModuleFilePath = path.join(projectDistDirectory, "fluexgl-dsp-wasm.js"),
        oldDistModuleFilePath = path.join(projectDistDirectory, "fluexgl-dsp.wasm.old.js");

    if (!fs.existsSync(distModuleFilePath))
        return console.error("[ERROR]: ".red + "Could not post build wasm, because the module could not be located.");

    const moduleFileContent = fs.readFileSync(distModuleFilePath);

    const newModuleFileContent = `
        // This line has been generated from the 'post-build-wasm.js' script. \n
        import { TextDecoder } from "text-decoding"; \n
        ${moduleFileContent} \n
        if(typeof AudioWorkletProcessor !== "undefined") {
            AudioWorkletProcessor.wasm = wasm_bindgen;
        }
    `;

    fs.writeFileSync(oldDistModuleFilePath, newModuleFileContent, "utf-8");
    fs.writeFileSync(distModuleFilePath, newModuleFileContent, "utf-8");
    console.log("[INFO]: ".yellow + "Succesfully added imports into generated javascript file. Now generating worklets...");

    const webpackConfigFile = path.join(projectRootDirectory, "webpack.config.cjs");

    if(!fs.existsSync(webpackConfigFile))
        return console.log("[ERROR]: " + "Could not post build wasm module, because ")

    async function internalThread() {
        return new Promise(function(resolve, reject) {
            cp.exec(`npx webpack --config ${webpackConfigFile}`, function(err, stdout, stderr) {

                stdout && console.log(stdout);
                stderr && console.log(stderr);
            }).on("close", resolve);
        })
    }

    await internalThread();

    console.log("[SUCCES]: ".green + "Succesfully generated worklets. Post building wasm is now done, and ready for deployment.");
})()