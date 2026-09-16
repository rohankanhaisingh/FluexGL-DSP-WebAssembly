import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

enum PhaserMessageCommandId {
    SetRateHz,
    SetMinFreqHz,
    SetMaxFreqHz,
    SetFeedback,
    SetMix
}

export default class PhaserProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "PhaserProcessor";
    public createdAt: number = Date.now();

    public phaser: (wasm_bindgen.Phaser | null)[] = [];

    public rateHz: number = 0.5;
    public minFreqHz: number = 200;
    public maxFreqHz: number = 2000;
    public feedback: number = 0;
    public mix: number = 0.5;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.rateHz = options.parameterData?.rateHz ?? this.rateHz;
        this.minFreqHz = options.parameterData?.minFreqHz ?? this.minFreqHz;
        this.maxFreqHz = options.parameterData?.maxFreqHz ?? this.maxFreqHz;
        this.feedback = options.parameterData?.feedback ?? this.feedback;
        this.mix = options.parameterData?.mix ?? this.mix;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<PhaserMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case PhaserMessageCommandId.SetRateHz:
                    return this.setRateHz(data.data);
                case PhaserMessageCommandId.SetMinFreqHz:
                    return this.setMinFreqHz(data.data);
                case PhaserMessageCommandId.SetMaxFreqHz:
                    return this.setMaxFreqHz(data.data);
                case PhaserMessageCommandId.SetFeedback:
                    return this.setFeedback(data.data);
                case PhaserMessageCommandId.SetMix:
                    return this.setMix(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
        });
    }

    private ensureInstance(channelIndex: number) {
        if (!this.phaser[channelIndex]) {
            const inst = new AudioWorkletProcessor.wasm.Phaser(
                sampleRate,
                this.rateHz,
                this.minFreqHz,
                this.maxFreqHz,
                this.feedback,
                this.mix
            );
            this.phaser[channelIndex] = inst;
        }
    }

    private forEachInstance(cb: (p: wasm_bindgen.Phaser) => void) {
        for (let i = 0; i < this.phaser.length; i++) {
            const inst = this.phaser[i];
            if (inst) cb(inst);
        }
    }

    private setRateHz(v: number) {
        this.rateHz = v ?? this.rateHz;
        this.forEachInstance(p => p.set_rate_hz(this.rateHz));
        sendMessageToAudioWorkletNode(this, "message", `Set rateHz of Phaser to ${this.rateHz}.`);
    }
    private setMinFreqHz(v: number) {
        this.minFreqHz = v ?? this.minFreqHz;
        this.forEachInstance(p => p.set_min_freq_hz(this.minFreqHz));
        sendMessageToAudioWorkletNode(this, "message", `Set minFreqHz of Phaser to ${this.minFreqHz}.`);
    }
    private setMaxFreqHz(v: number) {
        this.maxFreqHz = v ?? this.maxFreqHz;
        this.forEachInstance(p => p.set_max_freq_hz(this.maxFreqHz));
        sendMessageToAudioWorkletNode(this, "message", `Set maxFreqHz of Phaser to ${this.maxFreqHz}.`);
    }
    private setFeedback(v: number) {
        this.feedback = v ?? this.feedback;
        this.forEachInstance(p => p.set_feedback(this.feedback));
        sendMessageToAudioWorkletNode(this, "message", `Set feedback of Phaser to ${this.feedback}.`);
    }
    private setMix(v: number) {
        this.mix = v ?? this.mix;
        this.forEachInstance(p => p.set_mix(this.mix));
        sendMessageToAudioWorkletNode(this, "message", `Set mix of Phaser to ${this.mix}.`);
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

            if ((this.mix ?? 0) === 0 || !this.phaser[ch]) {
                outChan.set(inChan);
                continue;
            }

            outChan.set(inChan);
            this.phaser[ch]!.process(outChan);

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
