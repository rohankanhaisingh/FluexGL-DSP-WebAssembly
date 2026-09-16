import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

enum DelayMessageCommandId {
    SetDelayMs,
    SetFeedback,
    SetMix
}

export default class DelayProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "DelayProcessor";
    public createdAt: number = Date.now();

    public delay: (wasm_bindgen.Delay | null)[] = [];

    public delayMs: number = 300;
    public feedback: number = 0.35;
    public mix: number = 0.35;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.delayMs = options.parameterData?.delayMs ?? this.delayMs;
        this.feedback = options.parameterData?.feedback ?? this.feedback;
        this.mix = options.parameterData?.mix ?? this.mix;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<DelayMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case DelayMessageCommandId.SetDelayMs:
                    return this.setDelayMs(data.data);
                case DelayMessageCommandId.SetFeedback:
                    return this.setFeedback(data.data);
                case DelayMessageCommandId.SetMix:
                    return this.setMix(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
        });
    }

    private ensureInstance(channelIndex: number) {
        if (!this.delay[channelIndex]) {
            const inst = new AudioWorkletProcessor.wasm.Delay(
                sampleRate,
                this.delayMs,
                this.feedback,
                this.mix
            );
            this.delay[channelIndex] = inst;
        }
    }

    private forEachInstance(cb: (d: wasm_bindgen.Delay) => void) {
        for (let i = 0; i < this.delay.length; i++) {
            const inst = this.delay[i];
            if (inst) cb(inst);
        }
    }

    private setDelayMs(v: number) {
        this.delayMs = v ?? this.delayMs;
        this.forEachInstance(d => d.set_delay_ms(this.delayMs));
        sendMessageToAudioWorkletNode(this, "message", `Set delayMs of Delay to ${this.delayMs}.`);
    }
    private setFeedback(v: number) {
        this.feedback = v ?? this.feedback;
        this.forEachInstance(d => d.set_feedback(this.feedback));
        sendMessageToAudioWorkletNode(this, "message", `Set feedback of Delay to ${this.feedback}.`);
    }
    private setMix(v: number) {
        this.mix = v ?? this.mix;
        this.forEachInstance(d => d.set_mix(this.mix));
        sendMessageToAudioWorkletNode(this, "message", `Set mix of Delay to ${this.mix}.`);
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

        const isBypassed = (this.mix ?? 0) === 0;

        for (let ch = 0; ch < input.length; ch++) {
            const inChan = input[ch];
            const outChan = output[ch];
            if (!inChan || !outChan) continue;

            this.ensureInstance(ch);

            if (isBypassed || !this.delay[ch]) {
                outChan.set(inChan);
                continue;
            }

            outChan.set(inChan);
            this.delay[ch]!.process(outChan);

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
