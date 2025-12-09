import { processChannels } from "../../utilities/helpers";

enum SoftClipMessageCommandId {
    SetDrive,
    SetGain
}

export default class SoftClipProcessor extends AudioWorkletProcessor {

    public softClip: wasm_bindgen.SoftClip | null = null;

    public drive: number = 1;
    public gain: number = 1;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.drive = options.parameterData?.drive ?? 0;
        this.gain = options.parameterData?.gain ?? 1;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<SoftClipMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case SoftClipMessageCommandId.SetDrive:
                    return this.setDrive(data.data);
                case SoftClipMessageCommandId.SetGain:
                    return this.setGain(data.data);
            }
        };

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.softClip = new AudioWorkletProcessor.wasm.SoftClip(this.drive, this.gain);
            this.isReady = true;
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

    private processChannel(channel: Float32Array, channelIndex: number): void {
        this.softClip?.process(channel);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {

        if (!this.isReady || !this.softClip) {
            processChannels(inputs, outputs);
            return true;
        }

        processChannels(inputs, outputs, this.processChannel.bind(this));
        return true;
    }
}