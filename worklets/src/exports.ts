import "../../dist/fluexgl-dsp-wasm.js";

import WhiteNoiseProcessor from "./worklets/WhiteNoiseProcessor.worklet";
import ChorusProcessor from "./worklets/ChorusProcessor.worklet";
import ReverbProcessor from "./worklets/ReverbProcessor.worklet";
import DelayProcessor from "./worklets/DelayProcessor.worklet";
import FlangerProcessor from "./worklets/FlangerProcessor.worklet";
import PhaserProcessor from "./worklets/PhaserProcessor.worklet";

import HardClipProcessor from "./worklets/clips/HardClipProcessor.worklet";
import SoftClipProcessor from "./worklets/clips/SoftClipProcessor.worklet";

import LowPassFilterProcessor from "./worklets/filters/LowPassFilter.worklet";
import HighPassFilterProcessor from "./worklets/filters/HighPassFilter.worklet";
import NotchFilterProcessor from "./worklets/filters/NotchFilter.worklet";
import BandPassFilterProcessor from "./worklets/filters/BandPassFilter.worklet";

registerProcessor("HardClipProcessor", HardClipProcessor);
registerProcessor("SoftClipProcessor", SoftClipProcessor);
registerProcessor("WhiteNoiseProcessor", WhiteNoiseProcessor);
registerProcessor("ChorusProcessor", ChorusProcessor);
registerProcessor("ReverbProcessor", ReverbProcessor);
registerProcessor("DelayProcessor", DelayProcessor);
registerProcessor("FlangerProcessor", FlangerProcessor);
registerProcessor("PhaserProcessor", PhaserProcessor);
registerProcessor("LowPassFilterProcessor", LowPassFilterProcessor);
registerProcessor("HighPassFilterProcessor", HighPassFilterProcessor);
registerProcessor("NotchFilterProcessor", NotchFilterProcessor);
registerProcessor("BandPassFilterProcessor", BandPassFilterProcessor);
