$libPath = Join-Path -Path $PSScriptRoot -ChildPath "../../lib";
$postBuildPath = Join-Path -Path $PSScriptRoot -ChildPath "../post-build-wasm.js";

if (-not (Test-Path $libPath)) {
    Write-Error "Library folder not found at path: $libPath"
    exit 1
}

Set-Location -Path $libPath

Write-Host "Watching for changes in 'src'..." -ForegroundColor Cyan

cargo watch -w src -s "wasm-pack build --target no-modules --out-dir ../_dist/ --out-name fluexgl-dsp-wasm && node $($postBuildPath)";
