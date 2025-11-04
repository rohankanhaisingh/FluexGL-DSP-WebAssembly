"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var html_minimizer_webpack_plugin_1 = __importDefault(require("html-minimizer-webpack-plugin"));
var terser_webpack_plugin_1 = __importDefault(require("terser-webpack-plugin"));
var rootDir = path_1.default.join(__dirname), workletsDirectoryPath = path_1.default.join(rootDir, "worklets"), workletsSourceDirectoryPath = path_1.default.join(workletsDirectoryPath, "src"), workletsDistDirectoryPath = path_1.default.join(workletsDirectoryPath, "_dist");
var webAssemblyDistDirectoryPath = path_1.default.join(rootDir, "_dist");
var entryFileMap = {};
var workletFiles = fs_1.default.readdirSync(workletsSourceDirectoryPath).filter(function (fileName) {
    return fileName ? fileName.endsWith("worklet.ts") : null;
});
workletFiles.forEach(function (workletFile) {
    var initialWorkletName = workletFile.substring(0, workletFile.indexOf(".worklet.ts"));
    entryFileMap[initialWorkletName] = path_1.default.join(workletsSourceDirectoryPath, workletFile);
});
if (Object.keys(entryFileMap).length === 0)
    throw new Error("Geen .worklet.ts bestanden gevonden in: ".concat(workletsSourceDirectoryPath));
var config = {
    mode: "production",
    target: "webworker",
    entry: {
        "SoftClipProcessor": path_1.default.join(workletsSourceDirectoryPath, "SoftClipProcessor.worklet.ts")
    },
    output: {
        path: workletsDistDirectoryPath,
        filename: "[name].worklet",
        clean: true,
        publicPath: "",
        globalObject: "globalThis"
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "@wasm/dist": webAssemblyDistDirectoryPath
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    devtool: false,
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
        minimize: true,
        minimizer: [
            new html_minimizer_webpack_plugin_1.default(),
            new terser_webpack_plugin_1.default({
                terserOptions: {
                    mangle: {
                        keep_fnames: true,
                        reserved: ['wasm_bindgen']
                    },
                    keep_fnames: true,
                    keep_classnames: true
                },
            }),
        ]
    }
};
exports.default = config;
