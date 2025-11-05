# FluexGL DSP WebAssembly

WebAssembly code used as part of the FluexGL DSP library.

---

## About

This repository contains the source code for the WebAssembly module, written in Rust using the `wasm-bindgen` tool.  
It forms a crucial part of FluexGL DSP, as the library uses WebAssembly to perform heavy audio processing without blocking the main thread.

FluexGL DSP requires two files when initializing the DSP pipeline:
- The compiled `.wasm` file  
- The generated `.worklet` file  

You can find these files packaged together in the release zip.

---

## Using Prebuilt Releases

To use the prebuilt worklets, go to the **Releases** page and download the latest version (recommended, since new effects are developed and released over time).

### Folder Contents

The zipped release file contains the following files:
- `fluexgl-dsp-processor.worklet`
- `fluexgl-dsp-wasm_bg.wasm`
- `fluexgl-dsp-wasm_bg.wasm.d.ts`
- `fluexgl-dsp-wasm.d.ts`
- `fluexgl-dsp-wasm.js`

### Usage

The `fluexgl-dsp-processor.worklet` and `fluexgl-dsp-wasm_bg.wasm` files are required.  
Copy these into your project and initialize the DSP pipeline as shown below:

```ts
import { DspPipeline } from "@fluexgl/dsp";

const pipeline = new DspPipeline({
    pathToWasm: "./assets/fluexgl-dsp/fluexgl-dsp-wasm_bg.wasm",
    pathToWorklet: "./assets/fluexgl-dsp/fluexgl-dsp-processor.worklet"
});

await pipeline.InitializeDspPipeline();
```

---

## Building the WebAssembly Module

If you want to build the WebAssembly module yourself, you’ll need to install the required tools.

### Requirements

The Rust toolchain must be installed first, as it’s needed for the other dependencies.

#### Linux / macOS

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Windows (PowerShell)

```powershell
irm https://sh.rustup.rs | sh
```

1. Add the WebAssembly target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. Install the `wasm-bindgen` CLI:
   ```bash
   cargo install wasm-bindgen-cli
   ```

3. Install the `wasm-pack` tool:
   ```bash
   cargo install wasm-pack
   ```

4. (Optional) Install `cargo-watch` to automatically rebuild when source files change:
   ```bash
   cargo install cargo-watch
   ```

5. (Optional) Install `binaryen` for additional optimization:
   ```bash
   sudo apt-get install -y binaryen
   ```

---

### Building

You can build the source code using several provided scripts.

#### Shell (Linux / macOS)

1. Compile the WebAssembly module:
   ```bash
   npm run sh:web-assembly:build
   ```

2. Build the Webpack configuration:
   ```bash
   npm run sh:webpack:build
   ```

3. Build the worklets:
   ```bash
   npm run sh:webpack:run
   ```

#### PowerShell (Windows)

1. Compile the WebAssembly module:
   ```bash
   npm run ps:web-assembly:build
   ```

2. Build the Webpack configuration:
   ```bash
   npm run ps:webpack:build
   ```

3. Build the worklets:
   ```bash
   npm run ps:webpack:run
   ```

#### Results

These commands will build the WebAssembly and worklet files into the `_dist/` folder.  
The generated files can be used when initializing the DSP pipeline.

---

## Custom Worklets

You can easily create custom worklets. Navigate to the following directory:

```
~/worklets/src/
```

All worklets are stored here.  
To create a custom worklet, add your file to:

```
~/worklets/src/worklets/
```

Export your custom class, and import it inside:

```
~/worklets/src/exports.ts
```

### Basic Example

**`CustomProcessor.worklet.ts`**

```ts
export default class CustomProcessor extends AudioWorkletProcessor {
    constructor(options?: AudioWorkletNodeOptions) {
        super(options);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {
        const output = outputs[0];

        output.forEach((channel) => {
            for (let i = 0; i < channel.length; i++) {
                channel[i] = Math.random() * 2 - 1;
            }
        });

        // Custom processing code here

        return true;
    }
}
```

**`exports.ts`**

```ts
import "../../_dist/fluexgl-dsp-wasm.js";

import SoftClipProcessor from "./worklets/SoftClipProcessor.worklet";
import WhiteNoiseProcessor from "./worklets/WhiteNoiseProcessor.worklet";

// NEW: import custom processor
import CustomProcessor from "./worklets/CustomProcessor.worklet";

registerProcessor("SoftClipProcessor", SoftClipProcessor);
registerProcessor("WhiteNoiseProcessor", WhiteNoiseProcessor);

// IMPORTANT: register your custom processor
registerProcessor("CustomProcessor", CustomProcessor);
```

---

### Summary

- The `.wasm` and `.worklet` files are the core of FluexGL DSP.
- You can either use prebuilt releases or build them yourself.
- Custom worklets allow you to extend the DSP functionality to your needs.
