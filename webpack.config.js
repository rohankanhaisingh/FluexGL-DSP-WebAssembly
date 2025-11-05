"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var terser_webpack_plugin_1 = __importDefault(require("terser-webpack-plugin"));
var rootDir = path_1.default.join(__dirname), workletsDirectoryPath = path_1.default.join(rootDir, "worklets"), workletsSourceDirectoryPath = path_1.default.join(workletsDirectoryPath, "src");
var webAssemblyDistDirectoryPath = path_1.default.join(rootDir, "_dist");
var config = {
    mode: "production",
    target: "webworker",
    entry: {
        "fluexgl-dsp-processor": path_1.default.join(workletsSourceDirectoryPath, "exports.ts")
    },
    output: {
        path: webAssemblyDistDirectoryPath,
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
    devtool: "source-map",
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
        minimize: true,
        minimizer: [
            new terser_webpack_plugin_1.default({
                exclude: path_1.default.join(webAssemblyDistDirectoryPath, "fluexgl-dsp-wasm.js"),
                terserOptions: {
                    mangle: {
                        reserved: ["wasm_bindgen"]
                    }
                }
            }),
        ]
    }
};
console.log(true);
exports.default = config;
