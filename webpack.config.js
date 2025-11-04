"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
var rootDir = path.join(__dirname), workletsDirectoryPath = path.join(rootDir, "worklets"), workletsSourceDirectoryPath = path.join(workletsDirectoryPath, "src"), workletsDistDirectoryPath = path.join(workletsDirectoryPath, "_dist");
var webAssemblyDistDirectoryPath = path.join(rootDir, "_dist");
var entryFileMap = {};
var workletFiles = fs.readdirSync(workletsSourceDirectoryPath).filter(function (fileName) {
    return fileName ? fileName.endsWith("worklet.ts") : null;
});
workletFiles.forEach(function (workletFile) {
    var initialWorkletName = workletFile.substring(0, workletFile.indexOf(".worklet.ts"));
    entryFileMap[initialWorkletName] = path.join(workletsSourceDirectoryPath, workletFile);
});
if (Object.keys(entryFileMap).length === 0)
    throw new Error("Geen .worklet.ts bestanden gevonden in: ".concat(workletsSourceDirectoryPath));
var config = {
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
    devtool: "source-map",
};
exports.default = config;
