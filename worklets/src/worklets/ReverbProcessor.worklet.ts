import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

enum ReverbMessageCommandId {
    SetRoomSize,
    SetDamping,
    SetDry,
    SetWet,
    SetPreDelayMs,
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
    public dry: number = 0.7;
    public wet: number = 0.3;
    public preDelayMs: number = 0;
    public stereoSpreadMs: number = DEFAULT_STEREO_SPREAD_MS;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.roomSize = options.parameterData?.roomSize ?? this.roomSize;
        this.damping = options.parameterData?.damping ?? this.damping;
        this.dry = options.parameterData?.dry ?? this.dry;
        this.wet = options.parameterData?.wet ?? this.wet;
        this.preDelayMs = options.parameterData?.preDelayMs ?? this.preDelayMs;
        this.stereoSpreadMs = options.parameterData?.stereoSpreadMs ?? this.stereoSpreadMs;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<ReverbMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case ReverbMessageCommandId.SetRoomSize:
                    return this.setRoomSize(data.data);
                case ReverbMessageCommandId.SetDamping:
                    return this.setDamping(data.data);
                case ReverbMessageCommandId.SetDry:
                    return this.setDry(data.data);
                case ReverbMessageCommandId.SetWet:
                    return this.setWet(data.data);
                case ReverbMessageCommandId.SetPreDelayMs:
                    return this.setPreDelayMs(data.data);
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
                this.dry,
                this.wet,
                this.preDelayMs,
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
    private setDry(v: number) {
        this.dry = v ?? this.dry;
        this.forEachInstance(r => r.set_dry(this.dry));
        sendMessageToAudioWorkletNode(this, "message", `Set dry of Reverb to ${this.dry}.`);
    }
    private setWet(v: number) {
        this.wet = v ?? this.wet;
        this.forEachInstance(r => r.set_wet(this.wet));
        sendMessageToAudioWorkletNode(this, "message", `Set wet of Reverb to ${this.wet}.`);
    }
    private setPreDelayMs(v: number) {
        this.preDelayMs = v ?? this.preDelayMs;
        this.forEachInstance(r => r.set_pre_delay_ms(this.preDelayMs));
        sendMessageToAudioWorkletNode(this, "message", `Set preDelayMs of Reverb to ${this.preDelayMs}.`);
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

        // Wet and dry are independent gains rather than a single crossfade,
        // so only skip processing entirely when it would be a true no-op
        // (no reverb contribution and the dry signal left at unity gain).
        const isBypassed = (this.wet ?? 0) === 0 && (this.dry ?? 1) === 1;

        for (let ch = 0; ch < input.length; ch++) {
            const inChan = input[ch];
            const outChan = output[ch];
            if (!inChan || !outChan) continue;

            this.ensureInstance(ch);

            if (isBypassed || !this.reverb[ch]) {
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
