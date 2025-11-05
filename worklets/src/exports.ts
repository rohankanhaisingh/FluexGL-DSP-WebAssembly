import "../../_dist/fluexgl-dsp-wasm.js";

import SoftClipProcessor from "./worklets/SoftClipProcessor.worklet";
import WhiteNoiseProcessor from "./worklets/WhiteNoiseProcessor.worklet";

registerProcessor("SoftClipProcessor", SoftClipProcessor);
registerProcessor("WhiteNoiseProcessor", WhiteNoiseProcessor);