declare abstract class AudioWorkletProcessor {
    readonly port: MessagePort;
    static parameterDescriptors?: AudioParamDescriptor[];
    protected isReady: boolean;
    protected module: WebAssembly.Module | null;
    constructor(options?: AudioWorkletNodeOptions);
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean;
}
interface AudioWorkletNodeOptions extends AudioNodeOptions {
    numberOfInputs?: number;
    numberOfOutputs?: number;
    outputChannelCount?: number[];
    parameterData?: Record<string, number>;
    processorOptions?: {
        module: WebAssembly.Module;
    };
}
interface AudioParamDescriptor {
    name: string;
    defaultValue?: number;
    minValue?: number;
    maxValue?: number;
    automationRate?: "k-rate" | "a-rate";
}
interface AudioWorkletProcessorConstructor {
    new (...args: any[]): AudioWorkletProcessor;
    parameterDescriptors?: AudioParamDescriptor[];
}
declare global {
    function registerProcessor(name: string, processorCtor: AudioWorkletProcessorConstructor): void;
}
export { AudioWorkletProcessor, type AudioParamDescriptor, type AudioWorkletProcessorConstructor, type AudioWorkletNodeOptions };
//# sourceMappingURL=typings.d.ts.map