cd ../lib
wasm-pack build --target no-modules --out-dir ../_dist/ --out-name fluexgl-dsp-wasm
cd ../scripts
node post-build-wasm.js
cd ../