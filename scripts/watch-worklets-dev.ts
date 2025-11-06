/**
 * This script watches for worklet file changes, builds them
 * and finally moves the generated worklet file into the
 * FluexGL TestApplication project folder.
 *
 * It only works if the paths are correctly set.
 */

import path from "path";
import fs from "fs";
import colors from "colors";
import { execSync } from "child_process";
import { globSync } from "glob";

colors.enable();

const rootPath: string = path.join(__dirname, "..");
const workletsSourceFolderPath: string = path.join(rootPath, "worklets", "src");
const testApplicationFolderPath: string = path.join(rootPath, "..", "FluexGL-TestApplication");

if (!fs.existsSync(workletsSourceFolderPath) || !fs.existsSync(testApplicationFolderPath)) {
    throw new Error(
        "Cannot watch for file changes because one or more specified folders do not exist."
    );
}

const testApplicationAssetsDataFolderPath: string = path.join(
    testApplicationFolderPath,
    "src",
    "public",
    "assets",
    "data"
);

if (!fs.existsSync(testApplicationAssetsDataFolderPath)) {
    throw new Error(
        "Cannot watch for file changes because the output destination could not be found."
    );
}

const files: string[] = globSync("**/*.ts", {
    cwd: workletsSourceFolderPath
});

files.forEach((relativeFilePath: string) => {

    const fullFilePath: string = path.join(workletsSourceFolderPath, relativeFilePath);

    fs.watchFile(fullFilePath, { interval: 100 }, (current: fs.Stats, previous: fs.Stats) => {
        if (current.mtimeMs !== previous.mtimeMs) {
            runDevelopmentPipeline().catch((err) => {
                console.error(colors.red("Error while running development pipeline:"));
                console.error(err);
            });
        }
    });
});

console.log(`Now listening for file changes on ${files.length} files.`.green);

async function runDevelopmentPipeline(): Promise<void> {
    console.log(colors.white("Found file changes. Now attempting to run building pipeline."));

    const start: number = Date.now();

    execSync("npx webpack --config webpack.config.js", {
        cwd: rootPath,
        stdio: "inherit"
    });

    const generatedWorkletFilePath: string = path.join(
        rootPath,
        "_dist",
        "fluexgl-dsp-processor.worklet"
    );

    if (!fs.existsSync(generatedWorkletFilePath)) {
        throw new Error("Could not copy the generated worklet file because it does not exist.");
    }

    const copyDestinationPath: string = path.join(
        testApplicationAssetsDataFolderPath,
        "fluexgl-dsp-processor.worklet"
    );

    console.log(copyDestinationPath);

    fs.copyFileSync(
        generatedWorkletFilePath,
        copyDestinationPath
    );

    const difference: number = Date.now() - start;

    console.log(colors.green(`Successfully executed building pipeline within ${difference} ms.`));
}
