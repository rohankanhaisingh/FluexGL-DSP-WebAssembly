import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

/**
 * Must match the SaturationMessageCommandId enum in FluexGL DSP.
 */
enum SaturationMessageCommandId {
    SetDrive,
    SetMode,
    SetTone,
    SetMix,
    SetOutputGain
}

/**
 * Saturation with anti-aliasing (ADAA). One WASM instance per channel.
 */
export default class SaturationProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "SaturationProcessor";
    public createdAt: number = Date.now();

    public instances: (wasm_bindgen.Saturation | null)[] = [];

    public drive: number = 12;
    public mode: number = 0;
    public tone: number = 0;
    public mix: number = 1;
    public outputGain: number = 0;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        const p = options.parameterData ?? {};

        this.strictMode = p.strictMode ?? this.strictMode;
        this.drive = p.drive ?? this.drive;
        this.mode = p.mode ?? this.mode;
        this.tone = p.tone ?? this.tone;
        this.mix = p.mix ?? this.mix;
        this.outputGain = p.outputGain ?? this.outputGain;

        this.port.onmessage = this.handleMessage.bind(this);

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
            sendMessageToAudioWorkletNode(this, "wasm-instantiated", `Succesfully instantiated WASM module.`);
        });
    }

    private ensureInstance(channelIndex: number) {

        if (this.instances[channelIndex]) return;

        this.instances[channelIndex] = new AudioWorkletProcessor.wasm.Saturation(
            sampleRate,
            this.drive,
            this.mode,
            this.tone,
            this.mix,
            this.outputGain
        );
    }

    private handleMessage(event: MessageEvent): void {

        const { commandId, data }: MessagePortEventData<SaturationMessageCommandId, number> = event.data;

        if (typeof data !== "number" || !Number.isFinite(data)) return;

        for (const instance of this.instances) {

            if (!instance) continue;

            switch (commandId) {
                case SaturationMessageCommandId.SetDrive: instance.set_drive(data); break;
                case SaturationMessageCommandId.SetMode: instance.set_mode(data); break;
                case SaturationMessageCommandId.SetTone: instance.set_tone(data); break;
                case SaturationMessageCommandId.SetMix: instance.set_mix(data); break;
                case SaturationMessageCommandId.SetOutputGain: instance.set_output_gain(data); break;
            }
        }

        switch (commandId) {
            case SaturationMessageCommandId.SetDrive: this.drive = data; break;
            case SaturationMessageCommandId.SetMode: this.mode = data; break;
            case SaturationMessageCommandId.SetTone: this.tone = data; break;
            case SaturationMessageCommandId.SetMix: this.mix = data; break;
            case SaturationMessageCommandId.SetOutputGain: this.outputGain = data; break;
            default: return;
        }

        sendMessageToAudioWorkletNode(this, "message", `Set ${SaturationMessageCommandId[commandId]} of Saturation to ${data}.`);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {

        if (this.failed) return true;

        const input = inputs[0];
        const output = outputs[0];

        if (!output) return true;

        for (let ch = 0; ch < output.length; ch++) {

            const outChan = output[ch];

            if (!outChan) continue;

            // A mono input is copied to every output channel.
            const inChan = input?.[ch] ?? input?.[0] ?? null;

            if (!inChan) {
                outChan.fill(0);
                continue;
            }

            outChan.set(inChan);

            if (!this.isReady) continue;

            this.ensureInstance(ch);
            this.instances[ch]!.process(outChan);

            if (this.strictMode && bufferHasNaN(outChan)) {
                outChan.fill(0);
                this.failed = true;
                sendMessageToAudioWorkletNode(this, "error", `Failed to process because buffer contains NaN value.`);
                return true;
            }
        }

        return true;
    }
}
