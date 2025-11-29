export default class SoftClipProcessor extends AudioWorkletProcessor {

    public softClip: wasm_bindgen.SoftClip | null = null;

    public drive: number = 1;
    public gain: number = 1;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.drive = options.parameterData?.drive ?? 0;
        this.gain = options.parameterData?.gain ?? 1;

        this.port.onmessage = (event: MessageEvent) => {
            
            const data: MessagePortEventData = event.data;

            switch (data.type) {
                case "set-drive": return this.setDrive(data.value);
                case "set-gain": return this.setGain(data.value);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
            this.softClip = new AudioWorkletProcessor.wasm.SoftClip(options.parameterData?.drive ?? 0);
        });
    }

    private setDrive(drive: number = 0) {
        this.softClip?.set_drive(drive);
        this.drive = drive;
    }

    private setGain(gain: number = 1) {
        this.softClip?.set_gain(gain);
        this.gain = gain;
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

        if (!this.isReady || !this.softClip) {
            for (let ch = 0; ch < input.length; ch++) {
                if (!input[ch] || !output[ch]) continue;
                output[ch].set(input[ch]);
            }
            return true;
        }

        const drive = this.drive ?? 0; 

        if (drive === 0) {

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

            outChan.set(inChan);
            this.softClip.process(outChan);
        }

        return true;
    }
}