cd ../lib
cargo watch -w src -s "wasm-pack build --target no-modules --out-dir ../_dist/ --out-name fluexgl-dsp-wasm"