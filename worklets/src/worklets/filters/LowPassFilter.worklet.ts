enum LowPassFilterMessageCommandId {
    SetCutoff,
    SetMinFrequency
}

export default class LowPassFilterProcessor extends AudioWorkletProcessor {

    public lowPassInstances: Array<wasm_bindgen.LowPass | null> = [];

    public cutoff: number = 4000;
    public minFrequency: number = 10;
    public isReady: boolean = false;

    constructor(options: AudioWorkletNodeOptions) {
        super();

        this.port.onmessage = this.handleMessage.bind(this);

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            const outputChannelCount = options.outputChannelCount ?? [2];

            for (let c of outputChannelCount) {
                for (let i = 0; i < c; i++) {
                    const lp = new AudioWorkletProcessor.wasm.LowPass(sampleRate, this.cutoff);
                    lp.set_min_freq(this.minFrequency);
                    this.lowPassInstances.push(lp);
                }
            }

            this.isReady = true;
        });
    }

    private handleMessage(event: MessageEvent): void {
        var data: MessagePortEventData<LowPassFilterMessageCommandId, number> = event.data;

        switch (data.commandId) {
            case LowPassFilterMessageCommandId.SetCutoff:
                this.setCutoff(data.data);
                break;
            case LowPassFilterMessageCommandId.SetMinFrequency:
                this.setMinFrequency(data.data);
                break;
        }
    }

    private setCutoff(cutoff: number = 4000): void {
        this.cutoff = cutoff;
        for (var i = 0; i < this.lowPassInstances.length; i++) {
            var inst = this.lowPassInstances[i];
            if (inst) {
                inst.set_cutoff(cutoff);
            }
        }
    }

    private setMinFrequency(minFrequency: number = 10): void {
        this.minFrequency = minFrequency;
        for (var i = 0; i < this.lowPassInstances.length; i++) {
            var inst = this.lowPassInstances[i];
            if (inst) {
                inst.set_min_freq(minFrequency);
            }
        }
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
