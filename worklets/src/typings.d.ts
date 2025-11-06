declare abstract class AudioWorkletProcessor {
    public readonly port: MessagePort;

    public static parameterDescriptors?: AudioParamDescriptor[];
    public static wasm: wasm_bindgen;

    protected isReady: boolean;
    protected module: WebAssembly.Module | null;

    constructor(options?: AudioWorkletNodeOptions);

    public process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: any
    ): boolean;
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
}

interface AudioWorkletProcessorConstructor {
    new (options: AudioWorkletNodeOptions): AudioWorkletProcessor;
}

interface MessagePortEventData {
    type: string;
    value: any;
}

declare function registerProcessor(
    name: string,
    processorCtor: AudioWorkletProcessorConstructor
): void;

// AudioWorkletGlobalScope provides a global sampleRate constant
declare const sampleRate: number;
