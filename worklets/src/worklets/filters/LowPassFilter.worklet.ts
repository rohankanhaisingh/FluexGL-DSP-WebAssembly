enum LowPassFilterMessageCommandId {
    SetCutoff,
    SetMinFrequency
}

export default class LowPassFilterProcessor extends AudioWorkletProcessor {

    public softClip: wasm_bindgen.LowPass | null = null;

    public cutoff: number = 4000;
    public minFrequency: number = 10;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<LowPassFilterMessageCommandId, number> = event.data;
            
            switch(data.commandId) {
                case LowPassFilterMessageCommandId.SetCutoff:
                    return this.setCutoff(data.data);
                case LowPassFilterMessageCommandId.SetMinFrequency:
                    return this.setMinFrequency(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
            this.softClip = new AudioWorkletProcessor.wasm.LowPass();
        });
    }

    private setCutoff(cutoff: number = 4000) {
        this.cutoff = cutoff;
    }

    private setMinFrequency(minFrequency: number = 10) {
        this.minFrequency = minFrequency;
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {

        return true;
    }
}