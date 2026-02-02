const colors = require("colors");
const fs = require("fs");
const path = require("path");
const terser = require("terser");

(async function() {

    colors.enable();
    console.log(colors.bold("[STEP 3/4]:".bgMagenta) + " Minifying worklet source file.");

    const projectRootDirectory = path.join(__dirname, "../"),
        projectDistDirectory = path.join(projectRootDirectory, "_dist");

    if(!fs.existsSync(projectDistDirectory))
        return console.log(colors.bold("[ERROR]: ".red) + "Could not minify worklet files because the _dist directory could not be located.");

    const workletFilePath = path.join(projectDistDirectory, "fluexgl-dsp-processor.worklet"),
        oldWorkletFilePath = path.join(projectDistDirectory, "fluexgl-dsp-processor.old.worklet");

    if(!fs.existsSync(workletFilePath))
        return console.log(colors.red("[ERROR]: ".red) + "Could not minify worklet, because the original worklet source could not be located.");

    const workletFileContent = fs.readFileSync(workletFilePath, "utf8");

    const result = await terser.minify(workletFileContent, {
        compress: true,
        mangle: true,
    });

    if(result.error)
        return console.log(colors.bold("[ERROR]: ".red) + result.error);

    fs.writeFileSync(workletFilePath, result.code, "utf8");
    fs.writeFileSync(oldWorkletFilePath, workletFileContent, "utf8");

    console.log(colors.bold("[SUCCESS]: ".green) + "Succesfully minified worklet " + colors.bold(workletFilePath.yellow));
})();