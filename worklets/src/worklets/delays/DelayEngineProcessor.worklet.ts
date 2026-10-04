import { v4 } from "uuid";

import { bufferHasNaN, sendMessageToAudioWorkletNode } from "../../utilities/helpers";
import { StrictMode } from "../../typings";

/**
 * Must match the AdvancedDelayMessageCommandId enum in FluexGL DSP.
 */
enum DelayEngineMessageCommandId {
    SetDelayLeftMs,
    SetDelayRightMs,
    SetFeedback,
    SetCrossFeedback,
    SetMix,
    SetLowCut,
    SetHighCut,
    SetModulationRate,
    SetModulationDepth,
    SetDrive
}

/**
 * Must match the mode constants of the AdvancedDelay Rust struct.
 */
enum DelayEngineMode {
    Stereo = 0,
    Mono = 1,
    PingPong = 2
}

/**
 * Shared processor for MonoDelay, StereoDelay, PingPongDelay and AdvancedDelay.
 * All of them run the same AdvancedDelay WASM engine; only the mode differs.
 *
 * Unlike most processors, this one processes left and right together with a single
 * WASM instance, because the stereo and ping-pong modes feed one side into the other.
 * A mono input is treated as a stereo signal with the same content on both sides.
 */
abstract class DelayEngineProcessor extends AudioWorkletProcessor {

    public id: string = v4();
    public createdAt: number = Date.now();

    public engine: wasm_bindgen.AdvancedDelay | null = null;

    public delayLeftMs: number = 300;
    public delayRightMs: number = 300;
    public feedback: number = 0.35;
    public crossFeedback: number = 0;
    public mix: number = 0.35;
    public lowCut: number = 0;
    public highCut: number = 0;
    public modulationRate: number = 0;
    public modulationDepth: number = 0;
    public drive: number = 0;

    public isReady: boolean = false;
    private failed: boolean = false;
    private strictMode: StrictMode = StrictMode.Disabled;

    protected abstract mode: DelayEngineMode;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);

        const p = options.parameterData ?? {};

        this.strictMode = p.strictMode ?? this.strictMode;
        this.delayLeftMs = p.delayLeftMs ?? this.delayLeftMs;
        this.delayRightMs = p.delayRightMs ?? this.delayRightMs;
        this.feedback = p.feedback ?? this.feedback;
        this.crossFeedback = p.crossFeedback ?? this.crossFeedback;
        this.mix = p.mix ?? this.mix;
        this.lowCut = p.lowCut ?? this.lowCut;
        this.highCut = p.highCut ?? this.highCut;
        this.modulationRate = p.modulationRate ?? this.modulationRate;
        this.modulationDepth = p.modulationDepth ?? this.modulationDepth;
        this.drive = p.drive ?? this.drive;

        this.port.onmessage = this.handleMessage.bind(this);

        AudioWorkletProcessor.wasm(options.processorOptions.module).then(() => {

            this.engine = new AudioWorkletProcessor.wasm.AdvancedDelay(
                sampleRate,
                this.mode,
                this.delayLeftMs,
                this.delayRightMs,
                this.feedback,
                this.crossFeedback,
                this.mix,
                this.lowCut,
                this.highCut,
                this.modulationRate,
                this.modulationDepth,
                this.drive
            );

            this.isReady = true;
            sendMessageToAudioWorkletNode(this, "wasm-instantiated", `Succesfully instantiated WASM module.`);
        });
    }

    private handleMessage(event: MessageEvent): void {

        const { commandId, data }: MessagePortEventData<DelayEngineMessageCommandId, number> = event.data;

        if (typeof data !== "number" || !Number.isFinite(data)) return;

        switch (commandId) {
            case DelayEngineMessageCommandId.SetDelayLeftMs:
                this.delayLeftMs = data;
                this.engine?.set_delay_left_ms(data);
                break;
            case DelayEngineMessageCommandId.SetDelayRightMs:
                this.delayRightMs = data;
                this.engine?.set_delay_right_ms(data);
                break;
            case DelayEngineMessageCommandId.SetFeedback:
                this.feedback = data;
                this.engine?.set_feedback(data);
                break;
            case DelayEngineMessageCommandId.SetCrossFeedback:
                this.crossFeedback = data;
                this.engine?.set_cross_feedback(data);
                break;
            case DelayEngineMessageCommandId.SetMix:
                this.mix = data;
                this.engine?.set_mix(data);
                break;
            case DelayEngineMessageCommandId.SetLowCut:
                this.lowCut = data;
                this.engine?.set_low_cut(data);
                break;
            case DelayEngineMessageCommandId.SetHighCut:
                this.highCut = data;
                this.engine?.set_high_cut(data);
                break;
            case DelayEngineMessageCommandId.SetModulationRate:
                this.modulationRate = data;
                this.engine?.set_mod_rate(data);
                break;
            case DelayEngineMessageCommandId.SetModulationDepth:
                this.modulationDepth = data;
                this.engine?.set_mod_depth(data);
                break;
            case DelayEngineMessageCommandId.SetDrive:
                this.drive = data;
                this.engine?.set_drive(data);
                break;
            default:
                return;
        }

        sendMessageToAudioWorkletNode(this, "message", `Set ${DelayEngineMessageCommandId[commandId]} of ${this.name} to ${data}.`);
    }

    public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {

        if (this.failed) return true;

        const input = inputs[0];
        const output = outputs[0];

        if (!output || output.length === 0) return true;

        const outLeft = output[0];
        const outRight = output[1] ?? null;

        // No input connected: keep processing silence, so the echoes ring out.
        const inLeft = input?.[0] ?? null;
        const inRight = input?.[1] ?? inLeft;

        if (inLeft) outLeft.set(inLeft);
        else outLeft.fill(0);

        if (outRight) {
            if (inRight) outRight.set(inRight);
            else outRight.fill(0);
        }

        if (!this.isReady || !this.engine) return true;

        // The engine always processes a stereo pair. For a mono output, process a scratch copy.
        const right = outRight ?? outLeft.slice();

        this.engine.process(outLeft, right);

        if (this.strictMode && (bufferHasNaN(outLeft) || (outRight !== null && bufferHasNaN(outRight)))) {
            outLeft.fill(0);
            outRight?.fill(0);
            this.failed = true;
            sendMessageToAudioWorkletNode(this, "error", `Failed to process because buffer contains NaN value.`);
        }

        return true;
    }
}

export class MonoDelayProcessor extends DelayEngineProcessor {
    public name: string = "MonoDelayProcessor";
    protected mode: DelayEngineMode = DelayEngineMode.Mono;
}

export class StereoDelayProcessor extends DelayEngineProcessor {
    public name: string = "StereoDelayProcessor";
    protected mode: DelayEngineMode = DelayEngineMode.Stereo;
}

export class PingPongDelayProcessor extends DelayEngineProcessor {
    public name: string = "PingPongDelayProcessor";
    protected mode: DelayEngineMode = DelayEngineMode.PingPong;
}

export class AdvancedDelayProcessor extends DelayEngineProcessor {
    public name: string = "AdvancedDelayProcessor";
    protected mode: DelayEngineMode = DelayEngineMode.Stereo;
}
