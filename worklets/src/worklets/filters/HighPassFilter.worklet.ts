import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../../utilities/helpers";
import { StrictMode } from "../../typings";

enum HighPassFilterMessageCommandId {
    SetCutoff,
    SetMaxFrequency,
    SetQ
}

export default class HighPassFilterProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "HighPassFilterProcessor";
    public createdAt: number = Date.now();

    public highPassInstances: Array<any> = [];

    public cutoff: number = 500;
    public maxFrequency: number = sampleRate;
    public q: number = 0.7;
    public isReady: boolean = false;

    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.cutoff = options.parameterData?.cutoff ?? this.cutoff;
        this.maxFrequency = options.parameterData?.maxFrequency ?? this.maxFrequency;
        this.q = options.parameterData?.q ?? this.q;

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {

            const outputChannelCount = options.outputChannelCount ?? [2];

            for (const c of outputChannelCount) {
                for (let i = 0; i < c; i++) {

                    const hp = new AudioWorkletProcessor.wasm.HighPassFilter(sampleRate, this.cutoff, this.q);
                    
                    hp.set_max_freq(this.maxFrequency);
                    hp.set_q(this.q);
                    this.highPassInstances.push(hp);
                }
            }

            this.isReady = true;

            this.port.onmessage = this.handleMessage.bind(this);
            sendMessageToAudioWorkletNode(this, "wasm-instantiated", "Succesfully instantiated WASM module.");
        });
    }

    private handleMessage(event: MessageEvent): void {

        const data: MessagePortEventData<HighPassFilterMessageCommandId, number> = event.data;

        switch (data.commandId) {
            case HighPassFilterMessageCommandId.SetCutoff:
                return this.setCutoff(data.data);
            case HighPassFilterMessageCommandId.SetMaxFrequency:
                return this.setMaxFrequency(data.data);
            case HighPassFilterMessageCommandId.SetQ:
                return this.setQ(data.data);
        }
    }

    private setCutoff(cutoff: number = 500): void {

        this.cutoff = cutoff;

        for (const instance of this.highPassInstances)
            instance?.set_cutoff(cutoff);

        return sendMessageToAudioWorkletNode(this, "message", `Set cutoff of HighPassFilter to ${cutoff} on ${this.highPassInstances.length} instances.`);
    }

    private setMaxFrequency(maxFrequency: number = sampleRate): void {
        
        this.maxFrequency = maxFrequency;
        for (const instance of this.highPassInstances)
            instance?.set_max_freq(maxFrequency);

        return sendMessageToAudioWorkletNode(this, "message", `Set maximum frequency of HighPassFilter to ${maxFrequency} on ${this.highPassInstances.length} instances.`);
    }

    private setQ(q: number = 0.7): void {

        this.q = q;
        for (const instance of this.highPassInstances)
            instance?.set_q(q);

        return sendMessageToAudioWorkletNode(this, "message", `Set q of HighPassFilter to ${q} on ${this.highPassInstances.length} instances.`);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {

        if (this.failed) return true;

        const input = inputs[0],
            output = outputs[0];

        if (!output) return true;

        if (!this.isReady || this.highPassInstances.length === 0 || !input || input.length === 0) {
            for (let ch = 0; ch < output.length; ch++) {

                const inCh: Float32Array | null = input ? input[ch] : null,
                    outCh = output[ch];

                if (!outCh) continue;
                if (inCh) outCh.set(inCh);
                else outCh.fill(0);
            }
            return true;
        }

        const channels = Math.min(input.length, output.length, this.highPassInstances.length);

        for (let ch = 0; ch < channels; ch++) {

            const inCh: Float32Array | null = input[ch] ?? null,
                outCh: Float32Array | null = output[ch] ?? null,
                hp = this.highPassInstances[ch];

            if (!outCh) continue;

            if (!inCh || !hp) {
                if (inCh) outCh.set(inCh);
                else outCh.fill(0);
                continue;
            }

            outCh.set(inCh);
            hp.process(outCh);

            if (this.strictMode && bufferHasNaN(outCh)) {
                
                outCh.fill(0);
                this.failed = true;
                sendMessageToAudioWorkletNode(this, "error", "Failed to process because buffer contains NaN value.", outCh);
                return true;
            }
        }

        return true;
    }
}
