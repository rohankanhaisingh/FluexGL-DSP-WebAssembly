import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

enum FlangerMessageCommandId {
    SetBaseDelayMs,
    SetDepthMs,
    SetRateHz,
    SetMix,
    SetFeedback
}

export default class FlangerProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "FlangerProcessor";
    public createdAt: number = Date.now();

    public flanger: (wasm_bindgen.Flanger | null)[] = [];

    public baseDelayMs: number = 0.5;
    public depthMs: number = 2;
    public rateHz: number = 0.2;
    public mix: number = 0.5;
    public feedback: number = 0.3;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.baseDelayMs = options.parameterData?.baseDelayMs ?? this.baseDelayMs;
        this.depthMs = options.parameterData?.depthMs ?? this.depthMs;
        this.rateHz = options.parameterData?.rateHz ?? this.rateHz;
        this.mix = options.parameterData?.mix ?? this.mix;
        this.feedback = options.parameterData?.feedback ?? this.feedback;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<FlangerMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case FlangerMessageCommandId.SetBaseDelayMs:
                    return this.setBaseDelayMs(data.data);
                case FlangerMessageCommandId.SetDepthMs:
                    return this.setDepthMs(data.data);
                case FlangerMessageCommandId.SetRateHz:
                    return this.setRateHz(data.data);
                case FlangerMessageCommandId.SetMix:
                    return this.setMix(data.data);
                case FlangerMessageCommandId.SetFeedback:
                    return this.setFeedback(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
        });
    }

    private ensureInstance(channelIndex: number) {
        if (!this.flanger[channelIndex]) {
            const inst = new AudioWorkletProcessor.wasm.Flanger(
                sampleRate,
                this.baseDelayMs,
                this.depthMs,
                this.rateHz,
                this.mix,
                this.feedback
            );
            // Spread channel phases to avoid perfectly correlated L/R modulation.
            inst.set_phase_offset((channelIndex * 0.25) % 1);
            this.flanger[channelIndex] = inst;
        }
    }

    private forEachInstance(cb: (f: wasm_bindgen.Flanger) => void) {
        for (let i = 0; i < this.flanger.length; i++) {
            const inst = this.flanger[i];
            if (inst) cb(inst);
        }
    }

    private setBaseDelayMs(v: number) {
        this.baseDelayMs = v ?? this.baseDelayMs;
        this.forEachInstance(f => f.set_base_delay_ms(this.baseDelayMs));
        sendMessageToAudioWorkletNode(this, "message", `Set baseDelayMs of Flanger to ${this.baseDelayMs}.`);
    }
    private setDepthMs(v: number) {
        this.depthMs = v ?? this.depthMs;
        this.forEachInstance(f => f.set_depth_ms(this.depthMs));
        sendMessageToAudioWorkletNode(this, "message", `Set depthMs of Flanger to ${this.depthMs}.`);
    }
    private setRateHz(v: number) {
        this.rateHz = v ?? this.rateHz;
        this.forEachInstance(f => f.set_rate_hz(this.rateHz));
        sendMessageToAudioWorkletNode(this, "message", `Set rateHz of Flanger to ${this.rateHz}.`);
    }
    private setMix(v: number) {
        this.mix = v ?? this.mix;
        this.forEachInstance(f => f.set_mix(this.mix));
        sendMessageToAudioWorkletNode(this, "message", `Set mix of Flanger to ${this.mix}.`);
    }
    private setFeedback(v: number) {
        this.feedback = v ?? this.feedback;
        this.forEachInstance(f => f.set_feedback(this.feedback));
        sendMessageToAudioWorkletNode(this, "message", `Set feedback of Flanger to ${this.feedback}.`);
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

            if ((this.mix ?? 0) === 0 || !this.flanger[ch]) {
                outChan.set(inChan);
                continue;
            }

            outChan.set(inChan);
            this.flanger[ch]!.process(outChan);

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
