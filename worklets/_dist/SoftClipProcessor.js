import { SoftClip, initSync } from "../../_dist/wasm/fluexgl-dsp-wasm";
import { AudioWorkletProcessor } from "./typings";
class SoftClipProcessor extends AudioWorkletProcessor {
    constructor(options) {
        var _a, _b, _c, _d;
        super();
        this.softClip = null;
        this.drive = 0;
        if (!((_a = options.processorOptions) === null || _a === void 0 ? void 0 : _a.module))
            throw new Error("Could not construct AudioWorkletProcessor instance, because the required WASM module has not been provided.");
        initSync({ module: (_b = options.processorOptions) === null || _b === void 0 ? void 0 : _b.module });
        this.softClip = new SoftClip((_d = (_c = options.parameterData) === null || _c === void 0 ? void 0 : _c.drive) !== null && _d !== void 0 ? _d : 0);
    }
    process(inputs, outputs, parameters) {
        var _a, _b, _c, _d;
        if (!this.softClip)
            return false;
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output)
            return false;
        if (!input || input.length === 0) {
            for (let ch = 0; ch < output.length; ch++) {
                (_a = output[ch]) === null || _a === void 0 ? void 0 : _a.fill(0);
            }
            return true;
        }
        if (!this.isReady || !this.softClip) {
            for (let ch = 0; ch < input.length; ch++) {
                if (!input[ch] || !output[ch])
                    continue;
                (_b = output[ch]) === null || _b === void 0 ? void 0 : _b.set((_c = input[ch]) !== null && _c !== void 0 ? _c : []);
            }
            return true;
        }
        const driveParameter = (_d = parameters.drive) !== null && _d !== void 0 ? _d : 0;
        this.softClip.set_drive(driveParameter);
        for (let ch = 0; ch < input.length; ch++) {
            const inChan = input[ch];
            const outChan = output[ch];
            if (!inChan || !outChan)
                continue;
            outChan.set(inChan);
            this.softClip.process(outChan);
        }
        return true;
    }
}
registerProcessor("SoftClipProcessor", SoftClipProcessor);
//# sourceMappingURL=SoftClipProcessor.js.map