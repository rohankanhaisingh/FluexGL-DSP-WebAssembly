import "../../_dist/fluexgl-dsp-wasm.js";

import WhiteNoiseProcessor from "./worklets/WhiteNoiseProcessor.worklet";
import ChorusProcessor from "./worklets/ChorusProcessor.worklet";

import HardClipProcessor from "./worklets/clips/HardClipProcessor.worklet";
import SoftClipProcessor from "./worklets/clips/SoftClipProcessor.worklet";

import LowPassFilterProcessor from "./worklets/filters/LowPassFilter.worklet";
import HighPassFilterProcessor from "./worklets/filters/HighPassFilter.worklet";
import NotchFilterProcessor from "./worklets/filters/NotchFilter.worklet";

registerProcessor("HardClipProcessor", HardClipProcessor);
registerProcessor("SoftClipProcessor", SoftClipProcessor);
registerProcessor("WhiteNoiseProcessor", WhiteNoiseProcessor);
registerProcessor("ChorusProcessor", ChorusProcessor);
registerProcessor("LowPassFilterProcessor", LowPassFilterProcessor);
registerProcessor("HighPassFilterProcessor", HighPassFilterProcessor);
registerProcessor("NotchFilterProcessor", NotchFilterProcessor);
