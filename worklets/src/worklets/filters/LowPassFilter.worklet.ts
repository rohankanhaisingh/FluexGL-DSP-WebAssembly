import { v4 } from "uuid";

import { sendMessageToAudioWorkletNode } from "../../utilities/helpers";

enum LowPassFilterMessageCommandId {
    SetCutoff,
    SetMinFrequency,
    SetQ
}

export default class LowPassFilterProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "LowPassFilterProcessor";
    public createdAt: number = Date.now();

    public lowPassInstances: Array<wasm_bindgen.LowPassFilter | null> = [];

    public cutoff: number = 1000;
    public minFrequency: number = 10;
    public q: number = 0.7;
    public isReady: boolean = false;

    constructor(options: AudioWorkletNodeOptions) {
        super();

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {

            const outputChannelCount = options.outputChannelCount ?? [2];

            for (let c of outputChannelCount) {
                for (let i = 0; i < c; i++) {
                    const lp = new AudioWorkletProcessor.wasm.LowPassFilter(sampleRate, this.cutoff);
                    lp.set_min_freq(this.minFrequency);
                    this.lowPassInstances.push(lp);
                }
            }

            this.isReady = true;
            this.port.onmessage = this.handleMessage.bind(this);
            sendMessageToAudioWorkletNode(this, "wasm-instantiated", `Succesfully instantiated WASM module.`);
        });
    }

    private handleMessage(event: MessageEvent): void {

        const data: MessagePortEventData<LowPassFilterMessageCommandId, number> = event.data;

        switch (data.commandId) {
            case LowPassFilterMessageCommandId.SetCutoff:
                return this.setCutoff(data.data);
            case LowPassFilterMessageCommandId.SetMinFrequency:
                return this.setMinFrequency(data.data);
            case LowPassFilterMessageCommandId.SetQ:
                return this.setQ(data.data);
        }
    }

    private setCutoff(cutoff: number = 4000): void {

        this.cutoff = cutoff;

        for (const instance of this.lowPassInstances)
            instance?.set_cutoff(cutoff);

        return sendMessageToAudioWorkletNode(this, "message", `Set cutoff of LowPassFilter to ${cutoff} on ${this.lowPassInstances.length} instances.`);
    }

    private setMinFrequency(minFrequency: number = 10): void {

        this.minFrequency = minFrequency;

        for (const instance of this.lowPassInstances)
            instance?.set_min_freq(minFrequency);

        return sendMessageToAudioWorkletNode(this, "message", `Set minimum frequency of LowPassFilter to ${minFrequency} on ${this.lowPassInstances.length} instances.`);
    }

    private setQ(q: number = 0.7): void {

        this.q = q;

        for (const instance of this.lowPassInstances)
            instance?.set_q(q);

        return sendMessageToAudioWorkletNode(this, "message", `Set q of LowPassFilter to ${q} on ${this.lowPassInstances.length} instances.`);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {

        const input = inputs[0];
        const output = outputs[0];

        if (!output) return true;

        if (!this.isReady || this.lowPassInstances.length === 0 || !input || input.length === 0) {

            for (let ch = 0; ch < output.length; ch++) {
                const inCh: Float32Array | null = input ? input[ch] : null;
                const outCh = output[ch];

                if (!outCh) continue;

                if (inCh) outCh.set(inCh);
                else outCh.fill(0);
            }
            return true;
        }

        const channels = Math.min(input.length, output.length, this.lowPassInstances.length);

        for (let ch = 0; ch < channels; ch++) {

            let inCh: Float32Array | null = input[ch] ?? null;
            let outCh: Float32Array | null = output[ch] ?? null;

            const lp = this.lowPassInstances[ch];

            if (!outCh) continue;

            if (!inCh || !lp) {
                if (inCh) outCh.set(inCh);
                else outCh.fill(0);
                continue;
            }

            lp.process(inCh);
            outCh.set(inCh);
        }

        return true;
    }
}
