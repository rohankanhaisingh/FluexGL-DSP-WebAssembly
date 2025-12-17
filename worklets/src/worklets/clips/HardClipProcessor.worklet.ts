import { v4 } from "uuid";

import { bufferHasNaN, processChannels, sendMessageToAudioWorkletNode } from "../../utilities/helpers";
import { StrictMode } from "../../typings";

enum HardClipMessageCommandId {
    SetDrive,
    SetGain
}

export default class HardClipProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "HardClipProcessor";
    public createdAt: number = Date.now();

    public hardClip: wasm_bindgen.HardClip | null = null;

    public drive: number = 1;
    public gain: number = 1;

    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.strictMode = options.parameterData?.strictMode ?? this.strictMode;
        this.drive = options.parameterData?.drive ?? this.drive;
        this.gain = options.parameterData?.gain ?? this.gain;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<HardClipMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case HardClipMessageCommandId.SetDrive:
                    return this.setDrive(data.data);
                case HardClipMessageCommandId.SetGain:
                    return this.setGain(data.data);
            }
        }

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.hardClip = new AudioWorkletProcessor.wasm.HardClip(this.drive, this.gain);
            this.isReady = true;
        });
    }

    private setDrive(drive: number = 0) {
        this.hardClip?.set_drive(drive);
        this.drive = drive;
        sendMessageToAudioWorkletNode(this, "message", `Set drive of HardClip to ${drive}.`);
    }

    private setGain(gain: number = 1) {
        this.hardClip?.set_gain(gain);
        this.gain = gain;
        sendMessageToAudioWorkletNode(this, "message", `Set gain of HardClip to ${gain}.`);
    }

    private processChannel(channel: Float32Array, channelIndex: number): void {
        this.hardClip?.process(channel);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {

        if (this.failed) return true;
        
        if (!this.isReady || !this.hardClip) {
            processChannels(inputs, outputs);
            return true;
        }

        processChannels(inputs, outputs, this.processChannel.bind(this));

        if (this.strictMode) {
            const output = outputs[0];
            if (output) {
                for (let ch = 0; ch < output.length; ch++) {
                    const outChan = output[ch];
                    if (!outChan) continue;

                    if (bufferHasNaN(outChan)) {
                        outChan.fill(0);
                        this.failed = true;
                        sendMessageToAudioWorkletNode(this, "error", `Failed to process because buffer contains NaN value.`, outChan);
                        return true;
                    }
                }
            }
        }

        return true;
    }
}
