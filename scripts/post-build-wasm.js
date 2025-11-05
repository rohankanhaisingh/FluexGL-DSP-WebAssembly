/**
 * This script post processes the generated 'fluexgl-dsp-wasm.js' file, so webpack
 * can easily import the 
 */

const fs = require("fs");
const path = require("path");

const rootPath = path.join(__dirname, "../");
const webAssemblyDistDirectoryPath = path.join(rootPath, "_dist");

const webAssemblyGeneratedJavascriptFile = path.join(webAssemblyDistDirectoryPath, "fluexgl-dsp-wasm.js");

if(!fs.existsSync(webAssemblyGeneratedJavascriptFile)) {
    console.error("Could not located generated fluexgl-dsp-wasm.js file.");
    process.exit();
}

const fileContent = fs.readFileSync(webAssemblyGeneratedJavascriptFile, "utf8");

// The correct order of the post processed script.
// Do NOT fuck with this lmfao.
const newFileContent = [
    `import { TextDecoder } from "text-decoding";`,
    fileContent,
    `if(typeof AudioWorkletProcessor !== "undefined") {AudioWorkletProcessor.wasm = wasm_bindgen;}`
];

// Rewrite generated javascript file.
fs.writeFileSync(webAssemblyGeneratedJavascriptFile, newFileContent.join("\n"), "utf-8");

console.log("Succesfully post processes generated WASM file.");