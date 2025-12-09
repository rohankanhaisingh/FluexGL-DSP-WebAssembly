export type ChannelProcessor = (channel: Float32Array, channelIndex: number) => void;

export function processChannels(inputs: Float32Array[][], outputs: Float32Array[][], channelProcessor?: ChannelProcessor): void {

    const input = inputs[0];
    const output = outputs[0];

    if (!output) {
        return;
    }

    if (!input || input.length === 0) {
        for (let ch = 0; ch < output.length; ch++) {
            const outChan = output[ch];
            if (!outChan) {
                continue;
            }
            outChan.fill(0);
        }
        return;
    }

    for (let ch = 0; ch < input.length; ch++) {
        const inChan = input[ch];
        const outChan = output[ch];

        if (!inChan || !outChan) {
            continue;
        }

        outChan.set(inChan);

        if (channelProcessor) {
            channelProcessor(outChan, ch);
        }
    }
}
