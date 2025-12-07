
        // This line has been generated from the 'post-build-wasm.js' script. 

        import { TextDecoder } from "text-decoding"; 

        let wasm_bindgen;
(function() {
    const __exports = {};
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }
    let wasm = undefined;

    let cachedUint8ArrayMemory0 = null;

    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getArrayU8FromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder.decode();

    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return decodeText(ptr, len);
    }
    /**
     * @returns {string}
     */
    __exports.dsp_version = function() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.dsp_version();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    };

    /**
     * @returns {string}
     */
    __exports.os_version = function() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.os_version();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    };

    let cachedFloat32ArrayMemory0 = null;

    function getFloat32ArrayMemory0() {
        if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
            cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
        }
        return cachedFloat32ArrayMemory0;
    }

    let WASM_VECTOR_LEN = 0;

    function passArrayF32ToWasm0(arg, malloc) {
        const ptr = malloc(arg.length * 4, 4) >>> 0;
        getFloat32ArrayMemory0().set(arg, ptr / 4);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    const ChorusFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_chorus_free(ptr >>> 0, 1));

    class Chorus {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ChorusFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_chorus_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_rate_hz() {
            const ret = wasm.chorus_get_rate_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} rate_hz
         */
        set_rate_hz(rate_hz) {
            wasm.chorus_set_rate_hz(this.__wbg_ptr, rate_hz);
        }
        /**
         * @returns {number}
         */
        get_depth_ms() {
            const ret = wasm.chorus_get_depth_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.chorus_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} depth_ms
         */
        set_depth_ms(depth_ms) {
            wasm.chorus_set_depth_ms(this.__wbg_ptr, depth_ms);
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.chorus_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @returns {number}
         */
        get_base_delay_ms() {
            const ret = wasm.chorus_get_base_delay_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} base_delay_ms
         */
        set_base_delay_ms(base_delay_ms) {
            wasm.chorus_set_base_delay_ms(this.__wbg_ptr, base_delay_ms);
        }
        /**
         * @param {number} sample_rate
         * @param {number} base_delay_ms
         * @param {number} depth_ms
         * @param {number} rate_hz
         * @param {number} mix
         * @param {number} feedback
         */
        constructor(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback) {
            const ret = wasm.chorus_new(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback);
            this.__wbg_ptr = ret >>> 0;
            ChorusFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.chorus_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.chorus_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.chorus_set_mix(this.__wbg_ptr, mix);
        }
    }
    if (Symbol.dispose) Chorus.prototype[Symbol.dispose] = Chorus.prototype.free;

    __exports.Chorus = Chorus;

    const HardClipFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_hardclip_free(ptr >>> 0, 1));

    class HardClip {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(HardClip.prototype);
            obj.__wbg_ptr = ptr;
            HardClipFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            HardClipFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_hardclip_free(ptr, 0);
        }
        /**
         * @param {number} drive
         * @param {number} gain
         * @returns {HardClip}
         */
        static new(drive, gain) {
            const ret = wasm.hardclip_new(drive, gain);
            return HardClip.__wrap(ret);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.hardclip_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @returns {number}
         */
        get_gain() {
            const ret = wasm.hardclip_get_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} gain
         */
        set_gain(gain) {
            wasm.hardclip_set_gain(this.__wbg_ptr, gain);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.hardclip_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive
         */
        set_drive(drive) {
            wasm.hardclip_set_drive(this.__wbg_ptr, drive);
        }
    }
    if (Symbol.dispose) HardClip.prototype[Symbol.dispose] = HardClip.prototype.free;

    __exports.HardClip = HardClip;

    const OnePoleLowPassFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_onepolelowpass_free(ptr >>> 0, 1));

    class OnePoleLowPass {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(OnePoleLowPass.prototype);
            obj.__wbg_ptr = ptr;
            OnePoleLowPassFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            OnePoleLowPassFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_onepolelowpass_free(ptr, 0);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff_hz
         */
        set_cutoff(sample_rate, cutoff_hz) {
            wasm.onepolelowpass_set_cutoff(this.__wbg_ptr, sample_rate, cutoff_hz);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff_hz
         * @returns {OnePoleLowPass}
         */
        static new(sample_rate, cutoff_hz) {
            const ret = wasm.onepolelowpass_new(sample_rate, cutoff_hz);
            return OnePoleLowPass.__wrap(ret);
        }
    }
    if (Symbol.dispose) OnePoleLowPass.prototype[Symbol.dispose] = OnePoleLowPass.prototype.free;

    __exports.OnePoleLowPass = OnePoleLowPass;

    const SoftClipFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_softclip_free(ptr >>> 0, 1));

    class SoftClip {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            SoftClipFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_softclip_free(ptr, 0);
        }
        /**
         * @param {number} drive
         * @param {number} gain
         */
        constructor(drive, gain) {
            const ret = wasm.hardclip_new(drive, gain);
            this.__wbg_ptr = ret >>> 0;
            SoftClipFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.softclip_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @returns {number}
         */
        get_gain() {
            const ret = wasm.hardclip_get_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} gain
         */
        set_gain(gain) {
            wasm.hardclip_set_gain(this.__wbg_ptr, gain);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.hardclip_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive
         */
        set_drive(drive) {
            wasm.hardclip_set_drive(this.__wbg_ptr, drive);
        }
    }
    if (Symbol.dispose) SoftClip.prototype[Symbol.dispose] = SoftClip.prototype.free;

    __exports.SoftClip = SoftClip;

    const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    function __wbg_get_imports() {
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg___wbindgen_copy_to_typed_array_33fbd71146904370 = function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        };
        imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };
        imports.wbg.__wbindgen_init_externref_table = function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
            ;
        };

        return imports;
    }

    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        __wbg_init.__wbindgen_wasm_module = module;
        cachedFloat32ArrayMemory0 = null;
        cachedUint8ArrayMemory0 = null;


        wasm.__wbindgen_start();
        return wasm;
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (typeof module !== 'undefined') {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();

        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }

        const instance = new WebAssembly.Instance(module, imports);

        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (typeof module_or_path !== 'undefined') {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (typeof module_or_path === 'undefined' && typeof script_src !== 'undefined') {
            module_or_path = script_src.replace(/\.js$/, '_bg.wasm');
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    wasm_bindgen = Object.assign(__wbg_init, { initSync }, __exports);

})();
 

        if(typeof AudioWorkletProcessor !== "undefined") {
            AudioWorkletProcessor.wasm = wasm_bindgen;
        }
    