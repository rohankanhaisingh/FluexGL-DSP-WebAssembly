import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

enum ReverbMessageCommandId {
    SetRoomSize,
    SetDamping,
    SetMix,
    SetStereoSpreadMs
}

// Offsets each channel's comb/allpass delay-line tunings by this many
// milliseconds times its channel index, so channels decorrelate instead of
// producing a mono-sounding (perfectly correlated) reverb tail.
const DEFAULT_STEREO_SPREAD_MS = 0.52;

export default class ReverbProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "ReverbProcessor";
    public createdAt: number = Date.now();

    public reverb: (wasm_bindgen.Reverb | null)[] = [];

    public roomSize: number = 0.5;
    public damping: number = 0.5;
    public mix: number = 0.3;
    public stereoSpreadMs: number = DEFAULT_STEREO_SPREAD_MS;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.roomSize = options.parameterData?.roomSize ?? this.roomSize;
        this.damping = options.parameterData?.damping ?? this.damping;
        this.mix = options.parameterData?.mix ?? this.mix;
        this.stereoSpreadMs = options.parameterData?.stereoSpreadMs ?? this.stereoSpreadMs;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<ReverbMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case ReverbMessageCommandId.SetRoomSize:
                    return this.setRoomSize(data.data);
                case ReverbMessageCommandId.SetDamping:
                    return this.setDamping(data.data);
                case ReverbMessageCommandId.SetMix:
                    return this.setMix(data.data);
                case ReverbMessageCommandId.SetStereoSpreadMs:
                    return this.setStereoSpreadMs(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
        });
    }

    private ensureInstance(channelIndex: number) {
        if (!this.reverb[channelIndex]) {
            // Only channels beyond the first get a spread offset, so a mono
            // signal (channel 0) always uses the reference tuning.
            const spreadMs = this.stereoSpreadMs * channelIndex;

            const inst = new AudioWorkletProcessor.wasm.Reverb(
                sampleRate,
                this.roomSize,
                this.damping,
                this.mix,
                spreadMs
            );
            this.reverb[channelIndex] = inst;
        }
    }

    private forEachInstance(cb: (r: wasm_bindgen.Reverb, channelIndex: number) => void) {
        for (let i = 0; i < this.reverb.length; i++) {
            const inst = this.reverb[i];
            if (inst) cb(inst, i);
        }
    }

    private setRoomSize(v: number) {
        this.roomSize = v ?? this.roomSize;
        this.forEachInstance(r => r.set_room_size(this.roomSize));
        sendMessageToAudioWorkletNode(this, "message", `Set roomSize of Reverb to ${this.roomSize}.`);
    }
    private setDamping(v: number) {
        this.damping = v ?? this.damping;
        this.forEachInstance(r => r.set_damping(this.damping));
        sendMessageToAudioWorkletNode(this, "message", `Set damping of Reverb to ${this.damping}.`);
    }
    private setMix(v: number) {
        this.mix = v ?? this.mix;
        this.forEachInstance(r => r.set_mix(this.mix));
        sendMessageToAudioWorkletNode(this, "message", `Set mix of Reverb to ${this.mix}.`);
    }
    private setStereoSpreadMs(v: number) {
        this.stereoSpreadMs = v ?? this.stereoSpreadMs;

        // Same per-channel offset scheme as ensureInstance: channel 0 always
        // keeps the reference tuning, later channels get progressively more
        // spread. Rebuilds each instance's delay lines at the new lengths.
        this.forEachInstance((r, channelIndex) => r.set_stereo_spread_ms(this.stereoSpreadMs * channelIndex));
        sendMessageToAudioWorkletNode(this, "message", `Set stereoSpreadMs of Reverb to ${this.stereoSpreadMs}.`);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {
        if (this.failed) return true;

        const input = inputs[0];
        const output = outputs[0];

        if (!output) return true;

        if (!input || input.length === 0) {
            for (let ch = 0; ch < output.length; ch++) {
                output[ch]?.fill(0);
            }
            return true;
        }

        if (!this.isReady) {
            for (let ch = 0; ch < input.length; ch++) {
                if (!input[ch] || !output[ch]) continue;
                output[ch].set(input[ch]);
            }
            return true;
        }

        for (let ch = 0; ch < input.length; ch++) {
            const inChan = input[ch];
            const outChan = output[ch];
            if (!inChan || !outChan) continue;

            this.ensureInstance(ch);

            // If bypassed, just copy input to output but still ensure instances exist.
            if ((this.mix ?? 0) === 0 || !this.reverb[ch]) {
                outChan.set(inChan);
                continue;
            }

            outChan.set(inChan);
            this.reverb[ch]!.process(outChan);

            if (this.strictMode && bufferHasNaN(outChan)) {
                outChan.fill(0);
                this.failed = true;
                sendMessageToAudioWorkletNode(this, "error", `Failed to process because buffer contains NaN value.`, outChan);
                return true;
            }
        }

        return true;
    }
}
