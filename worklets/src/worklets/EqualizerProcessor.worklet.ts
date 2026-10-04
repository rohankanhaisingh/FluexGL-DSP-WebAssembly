import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../utilities/helpers";
import { StrictMode } from "../typings";

/**
 * Must match the EqualizerMessageCommandId enum in FluexGL DSP.
 */
enum EqualizerMessageCommandId {
    SetBand,
    SetOutputGain
}

/** Must match MAX_BANDS of the Equalizer Rust struct. */
const MAX_BANDS = 8;

interface EqualizerBandMessage {
    index: number;
    type: number;
    frequency: number;
    gain: number;
    q: number;
    enabled: boolean;
}

/**
 * Parametric equalizer with up to eight bands. One WASM instance per channel.
 *
 * Because parameterData only accepts numbers, the initial bands are passed as
 * flattened keys: band0Type, band0Frequency, band0Gain, band0Q, band0Enabled, band1Type, ...
 */
export default class EqualizerProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public name: string = "EqualizerProcessor";
    public createdAt: number = Date.now();

    public instances: (wasm_bindgen.Equalizer | null)[] = [];

    public bands: EqualizerBandMessage[] = [];
    public outputGain: number = 0;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        const p = options.parameterData ?? {};

        this.strictMode = p.strictMode ?? this.strictMode;
        this.outputGain = p.outputGain ?? this.outputGain;

        for (let i = 0; i < MAX_BANDS; i++) {
            this.bands.push({
                index: i,
                type: p[`band${i}Type`] ?? 0,
                frequency: p[`band${i}Frequency`] ?? 1000,
                gain: p[`band${i}Gain`] ?? 0,
                q: p[`band${i}Q`] ?? 0.7071,
                enabled: (p[`band${i}Enabled`] ?? 0) === 1
            });
        }

        this.port.onmessage = this.handleMessage.bind(this);

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {
            this.isReady = true;
            sendMessageToAudioWorkletNode(this, "wasm-instantiated", `Succesfully instantiated WASM module.`);
        });
    }

    private configure(instance: wasm_bindgen.Equalizer) {

        for (const band of this.bands)
            instance.set_band(band.index, band.type, band.frequency, band.gain, band.q, band.enabled);

        instance.set_output_gain(this.outputGain);
    }

    private ensureInstance(channelIndex: number) {

        if (this.instances[channelIndex]) return;

        const instance = new AudioWorkletProcessor.wasm.Equalizer(sampleRate);

        this.configure(instance);
        this.instances[channelIndex] = instance;
    }

    private handleMessage(event: MessageEvent): void {

        const { commandId, data }: MessagePortEventData<EqualizerMessageCommandId, any> = event.data;

        switch (commandId) {
            case EqualizerMessageCommandId.SetBand: {

                const band = data as EqualizerBandMessage;

                if (!band || !Number.isInteger(band.index) || band.index < 0 || band.index >= MAX_BANDS) return;

                this.bands[band.index] = { ...band, enabled: !!band.enabled };

                for (const instance of this.instances)
                    instance?.set_band(band.index, band.type, band.frequency, band.gain, band.q, !!band.enabled);

                return sendMessageToAudioWorkletNode(this, "message", `Updated band ${band.index} of Equalizer.`);
            }
            case EqualizerMessageCommandId.SetOutputGain: {

                if (typeof data !== "number" || !Number.isFinite(data)) return;

                this.outputGain = data;

                for (const instance of this.instances)
                    instance?.set_output_gain(data);

                return sendMessageToAudioWorkletNode(this, "message", `Set output gain of Equalizer to ${data} dB.`);
            }
        }
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
