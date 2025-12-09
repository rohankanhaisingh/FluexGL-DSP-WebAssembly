import { processChannels } from "../../utilities/helpers";

enum HardClipMessageCommandId {
    SetDrive,
    SetGain
}

export default class HardClipProcessor extends AudioWorkletProcessor {

    public hardClip: wasm_bindgen.HardClip | null = null;

    public drive: number = 1;
    public gain: number = 1;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        this.drive = options.parameterData?.drive ?? 1;
        this.gain = options.parameterData?.gain ?? 1;

        this.port.onmessage = (event: MessageEvent) => {

            const data: MessagePortEventData<HardClipMessageCommandId, number> = event.data;

            switch (data.commandId) {
                case HardClipMessageCommandId.SetDrive:
                    return this.setDrive(data.data);
                case HardClipMessageCommandId.SetGain:
                    return this.setGain(data.data);
            }
        }
    }

    private setDrive(drive: number = 0) {
        this.hardClip?.set_drive(drive);
        this.drive = drive;
    }

    private setGain(gain: number = 1) {
        this.hardClip?.set_gain(gain);
        this.gain = gain;
    }

    private processChannel(channel: Float32Array, channelIndex: number): void {
        this.hardClip?.process(channel);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {
        
        if (!this.isReady || !this.hardClip) {
            processChannels(inputs, outputs);
            return true;
        }

        processChannels(inputs, outputs, this.processChannel.bind(this));

        return true;
    }
}