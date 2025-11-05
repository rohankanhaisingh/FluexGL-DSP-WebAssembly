import path from "path";

import TerserPlugin from "terser-webpack-plugin";
import type { Configuration } from "webpack";

const rootDir: string = path.join(__dirname),
    workletsDirectoryPath: string = path.join(rootDir, "worklets"),
    workletsSourceDirectoryPath: string = path.join(workletsDirectoryPath, "src"),
    workletsDistDirectoryPath: string = path.join(workletsDirectoryPath, "_dist");

const webAssemblyDistDirectoryPath: string = path.join(rootDir, "_dist");

const config: Configuration = {
    mode: "production",
    target: "webworker",
    entry: {
        "FluexGL-DSP-Processors": path.join(workletsSourceDirectoryPath, "exports.ts")
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
    devtool: "source-map",
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                exclude: path.join(webAssemblyDistDirectoryPath, "fluexgl-dsp-wasm.js"),
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

export default config;
