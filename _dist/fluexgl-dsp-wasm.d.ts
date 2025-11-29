declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
	export function dsp_version(): string;
	export function os_version(): string;
	export class Chorus {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_rate_hz(): number;
	  set_rate_hz(rate_hz: number): void;
	  get_depth_ms(): number;
	  get_feedback(): number;
	  set_depth_ms(depth_ms: number): void;
	  set_feedback(feedback: number): void;
	  get_base_delay_ms(): number;
	  set_base_delay_ms(base_delay_ms: number): void;
	  constructor(sample_rate: number, base_delay_ms: number, depth_ms: number, rate_hz: number, mix: number, feedback: number);
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	}
	export class OnePoleLowPass {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  set_cutoff(sample_rate: number, cutoff_hz: number): void;
	  static new(sample_rate: number, cutoff_hz: number): OnePoleLowPass;
	}
	export class SoftClip {
	  free(): void;
	  [Symbol.dispose](): void;
	  constructor(drive: number, gain: number);
	  process(buffer: Float32Array): void;
	  get_gain(): number;
	  set_gain(gain: number): void;
	  get_drive(): number;
	  set_drive(drive: number): void;
	}
	
}

declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_chorus_free: (a: number, b: number) => void;
  readonly __wbg_onepolelowpass_free: (a: number, b: number) => void;
  readonly chorus_get_base_delay_ms: (a: number) => number;
  readonly chorus_get_depth_ms: (a: number) => number;
  readonly chorus_get_feedback: (a: number) => number;
  readonly chorus_get_mix: (a: number) => number;
  readonly chorus_get_rate_hz: (a: number) => number;
  readonly chorus_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly chorus_process: (a: number, b: number, c: number, d: any) => void;
  readonly chorus_set_base_delay_ms: (a: number, b: number) => void;
  readonly chorus_set_depth_ms: (a: number, b: number) => void;
  readonly chorus_set_feedback: (a: number, b: number) => void;
  readonly chorus_set_mix: (a: number, b: number) => void;
  readonly chorus_set_rate_hz: (a: number, b: number) => void;
  readonly dsp_version: () => [number, number];
  readonly onepolelowpass_new: (a: number, b: number) => number;
  readonly onepolelowpass_set_cutoff: (a: number, b: number, c: number) => void;
  readonly os_version: () => [number, number];
  readonly softclip_get_drive: (a: number) => number;
  readonly softclip_get_gain: (a: number) => number;
  readonly softclip_new: (a: number, b: number) => number;
  readonly softclip_process: (a: number, b: number, c: number, d: any) => void;
  readonly softclip_set_drive: (a: number, b: number) => void;
  readonly softclip_set_gain: (a: number, b: number) => void;
  readonly __wbg_softclip_free: (a: number, b: number) => void;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
declare function wasm_bindgen (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
