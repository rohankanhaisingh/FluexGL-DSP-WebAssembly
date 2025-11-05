"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var html_minimizer_webpack_plugin_1 = __importDefault(require("html-minimizer-webpack-plugin"));
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
            new html_minimizer_webpack_plugin_1.default()
        ]
    }
};
exports.default = config;
