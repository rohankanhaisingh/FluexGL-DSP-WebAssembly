import { v4 } from "uuid";
import { AudioWorkletNodePostData, ChannelProcessor, ProcessorIdentificationCodes, MessageType } from "../typings";

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

export function sendMessageToAudioWorkletNode(processor: AudioWorkletProcessor, type: MessageType, message: string, additionalData?: any) {

    return processor.port.postMessage({
        message,
        type,
        id: v4(),
        timestamp: Date.now(), 
        additionalData,
        processor: {
            id: processor.id ?? ProcessorIdentificationCodes.UnknownProcessorId,
            name: processor.name ?? ProcessorIdentificationCodes.UnknownProcessorName,
            createdAt: processor.createdAt ?? ProcessorIdentificationCodes.UnknownProcessorCreationDate
        }
    } as AudioWorkletNodePostData);
}
