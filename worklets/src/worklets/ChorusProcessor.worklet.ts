enum ChorusMessageCommandId {
    SetBaseDelayMs,
    SetDepthMs,
    SetRateHz,
    SetMix,
    SetFeedback
}

export default class ChorusProcessor extends AudioWorkletProcessor {

    public chorus: (wasm_bindgen.Chorus | null)[] = [];

    public baseDelayMs: number = 15;
    public depthMs: number = 8;
    public rateHz: number = 1.5;
    public mix: number = 0;
    public feedback: number = 0.2;
    public sampleRate: number = 44100;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.baseDelayMs = options.parameterData?.baseDelayMs ?? this.baseDelayMs;
        this.depthMs = options.parameterData?.depthMs ?? this.depthMs;
        this.rateHz = options.parameterData?.rateHz ?? this.rateHz;
        this.mix = options.parameterData?.mix ?? this.mix;
        this.feedback = options.parameterData?.feedback ?? this.feedback;
        this.sampleRate = options.parameterData?.sampleRate ?? this.sampleRate;

        this.port.onmessage = (event: MessageEvent) => {
            
            const data: MessagePortEventData<ChorusMessageCommandId, number> = event.data;

            switch(data.commandId) {
                case ChorusMessageCommandId.SetBaseDelayMs:
                    return this.setBaseDelayMs(data.data);
                case ChorusMessageCommandId.SetDepthMs:
                    return this.setDepthMs(data.data);
                case ChorusMessageCommandId.SetRateHz:
                    return this.setRateHz(data.data);
                case ChorusMessageCommandId.SetMix:
                    return this.setMix(data.data);
                case ChorusMessageCommandId.SetFeedback:
                    return this.setFeedback(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
        });
    }

    private ensureInstance(channelIndex: number) {
        if (!this.chorus[channelIndex]) {
            this.chorus[channelIndex] = new AudioWorkletProcessor.wasm.Chorus(
                this.sampleRate,
                this.baseDelayMs,
                this.depthMs,
                this.rateHz,
                this.mix,
                this.feedback
            );
        }
    }

    private forEachInstance(cb: (c: wasm_bindgen.Chorus) => void) {
        for (let i = 0; i < this.chorus.length; i++) {
            const inst = this.chorus[i];
            if (inst) cb(inst);
        }
    }

    private setBaseDelayMs(v: number) {
        this.baseDelayMs = v ?? this.baseDelayMs;
        this.forEachInstance(c => c.set_base_delay_ms(this.baseDelayMs));
    }
    private setDepthMs(v: number) {
        this.depthMs = v ?? this.depthMs;
        this.forEachInstance(c => c.set_depth_ms(this.depthMs));
    }
    private setRateHz(v: number) {
        this.rateHz = v ?? this.rateHz;
        this.forEachInstance(c => c.set_rate_hz(this.rateHz));
    }
    private setMix(v: number) {
        this.mix = v ?? this.mix;
        this.forEachInstance(c => c.set_mix(this.mix));
    }
    private setFeedback(v: number) {
        this.feedback = v ?? this.feedback;
        this.forEachInstance(c => c.set_feedback(this.feedback));
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {
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

            // If bypass, just copy input to output but still ensure instances exist
            if ((this.mix ?? 0) === 0 || !this.chorus[ch]) {
                outChan.set(inChan);
                continue;
            }

            outChan.set(inChan);
            this.chorus[ch]!.process(outChan);
        }

        return true;
    }
}
