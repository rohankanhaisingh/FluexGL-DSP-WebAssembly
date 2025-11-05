export default class SoftClipProcessor extends AudioWorkletProcessor {

    public softClip: wasm_bindgen.SoftClip | null = null;
    public drive: number = 0;

    constructor(options: AudioWorkletNodeOptions) {
        
        super(options);

        this.port.addEventListener("message", (event: MessageEvent) => {
            
            const data: MessagePortEventData = event.data;

            switch(data.type) {
                case "set-drive":
                    this.softClip?.set_drive(data.value ?? 0);
            }
        });

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.softClip = new AudioWorkletProcessor.wasm.SoftClip(options.parameterData?.drive ?? 0);
        });
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {

        if (!this.softClip) return false;

        const input = inputs[0];
        const output = outputs[0];

        if (!input || !output) return false;

        if (!input || input.length === 0) {

            for (let ch = 0; ch < output.length; ch++) {
                output[ch]?.fill(0);
            }

            return true;
        }

        if (!this.isReady || !this.softClip) {
            for (let ch = 0; ch < input.length; ch++) {
                if (!input[ch] || !output[ch])
                    continue;

                output[ch]?.set(input[ch] ?? []);
            }

            return true;
        }

        const driveParameter: number = parameters.drive ?? 0;

        this.softClip.set_drive(driveParameter);

        for (let ch = 0; ch < input.length; ch++) {
            const inChan = input[ch];
            const outChan = output[ch];

            if (!inChan || !outChan) continue;

            outChan.set(inChan);
            this.softClip.process(outChan);
        }

        return true;
    }
}