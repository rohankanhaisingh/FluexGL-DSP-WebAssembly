export type ChannelProcessor = (channel: Float32Array, channelIndex: number) => void;
export type MessageType = "message" | "error" | "warning" | "wasm-instantiated";

export enum ProcessorIdentificationCodes {
    UnknownProcessorId = "UNKNOWN_PROCESSOR_ID",
    UnknownProcessorName = "UNKNOWN_PROCESSOR_NAME",
    UnknownProcessorCreationDate = "UNKNOWN_PROCESSOR_CREATION_DATE"
}

export interface ProcessorData {
    id: string | ProcessorIdentificationCodes.UnknownProcessorId;
    name: string | ProcessorIdentificationCodes.UnknownProcessorName;
    createdAt: number | ProcessorIdentificationCodes.UnknownProcessorCreationDate;
}

export interface AudioWorkletNodePostData {
    id: string;
    timestamp: number;
    message: string;
    type: MessageType;
    processor: ProcessorData;
    additionalData?: any;
}