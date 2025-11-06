import "../../_dist/fluexgl-dsp-wasm.js";

import SoftClipProcessor from "./worklets/SoftClipProcessor.worklet";
import WhiteNoiseProcessor from "./worklets/WhiteNoiseProcessor.worklet";
import ChorusProcessor from "./worklets/ChorusProcessor.worklet";

registerProcessor("SoftClipProcessor", SoftClipProcessor);
registerProcessor("WhiteNoiseProcessor", WhiteNoiseProcessor);
registerProcessor("ChorusProcessor", ChorusProcessor);
