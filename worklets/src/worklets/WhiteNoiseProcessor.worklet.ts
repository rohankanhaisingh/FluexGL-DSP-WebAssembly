export default class WhiteNoiseProcessor extends AudioWorkletProcessor {
    constructor(options?: AudioWorkletNodeOptions) {
        super(options);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {

        const output = outputs[0];

        output.forEach((channel) => {
            for (let i = 0; i < channel.length; i++) {
                channel[i] = Math.random() * 2 - 1;
            }
        });

        return true;
    }
}