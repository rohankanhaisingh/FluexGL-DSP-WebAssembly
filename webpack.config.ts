import path from "path";
import fs from "fs";

import HtmlMinimizerPlugin from "html-minimizer-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";

import type { Configuration } from "webpack";

const rootDir: string = path.join(__dirname),
    workletsDirectoryPath: string = path.join(rootDir, "worklets"),
    workletsSourceDirectoryPath: string = path.join(workletsDirectoryPath, "src"),
    workletsDistDirectoryPath: string = path.join(workletsDirectoryPath, "_dist");

const webAssemblyDistDirectoryPath: string = path.join(rootDir, "_dist");

const entryFileMap: { [K: string]: string } = {};

const workletFiles = fs.readdirSync(workletsSourceDirectoryPath).filter(function (fileName: string) {
    return fileName ? fileName.endsWith("worklet.ts") : null;
});

workletFiles.forEach((workletFile: string) => {
    const initialWorkletName: string = workletFile.substring(0, workletFile.indexOf(".worklet.ts"));

    entryFileMap[initialWorkletName] = path.join(workletsSourceDirectoryPath, workletFile);
});

if (Object.keys(entryFileMap).length === 0)
    throw new Error(`Geen .worklet.ts bestanden gevonden in: ${workletsSourceDirectoryPath}`);

const config: Configuration = {
    mode: "production",
    target: "webworker",
    entry: {
        "SoftClipProcessor": path.join(workletsSourceDirectoryPath, "SoftClipProcessor.worklet.ts")
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
            new HtmlMinimizerPlugin(),
            new TerserPlugin({
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

export default config;
