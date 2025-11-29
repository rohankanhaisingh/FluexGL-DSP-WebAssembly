const fs = require("fs");
const path = require("path");
const colors = require("colors");

(function () {

    colors.enable();

    /** @type {string[]} */
    const args = process.argv;

    const shouldIgnoreProjectConfiguration = args.includes("--project-config");

    const projectRootDirectory = path.join(__dirname, "../");

    const projectConfigurationFile = shouldIgnoreProjectConfiguration ?
        path.resolve(args.filter(str => str.endsWith("project.config.json"))[0])
        : path.join(projectRootDirectory, "project.config.json");

    if (!fs.existsSync(projectConfigurationFile))
        return console.log("[ERROR]: ".red + `Could not find required project.config.json file. Input: ${projectConfigurationFile.underline}`);

    const fileContent = fs.readFileSync(projectConfigurationFile),
        parsedFileContent = JSON.parse(fileContent);

    const outDirectory = parsedFileContent["outDir"];

    if (typeof outDirectory === "undefined")
        return console.log("[ERROR]: ".red + `Could not prepare program because the required option 'outDir' has not been specified.`);

    const moveIncludes = parsedFileContent["includes"] ?? [
        "fluexgl-dsp-processor.worklet",
        "fluexgl-dsp-wasm_bg.wasm",
    ];

    if(!fs.existsSync(outDirectory))
        return console.log("[ERROR]: ".red + `Could not move files into ${outDirectory}, because it could not be located.`);

    const distDirectory = path.join(projectRootDirectory, "_dist");

    if(!fs.existsSync(distDirectory))
        return console.log("[ERROR]: ".red + "Could not move files because the _dist file could not be located in the project's root directory.");

    for(const fileName of moveIncludes) {
        
        const includedFilePath = path.join(distDirectory, fileName);
        const destinationFilePath = path.join(outDirectory, fileName);

        if(!fs.existsSync(includedFilePath)) {
            console.log("[ERROR]: ".red + `Could not find ${includedFilePath}.`); 
        } else {
            fs.copyFileSync(includedFilePath, destinationFilePath);
        }
    }

    console.log("[SUCCES]: ".green + `Succesfully moved build DSP files into ${outDirectory}.`);
})();