Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    $rootPath = Resolve-Path (Join-Path -Path $PSScriptRoot -ChildPath '../../')

    $wasmLibPath = Join-Path -Path $rootPath -ChildPath 'lib'
    $distPath = Join-Path -Path $rootPath -ChildPath '_dist'
    $scriptsPath = Join-Path -Path $rootPath -ChildPath 'scripts'
    $postBuildFile = Join-Path -Path $scriptsPath -ChildPath 'post-build-wasm.js'

    if (-not (Test-Path $wasmLibPath)) {
        throw "Lib-folder not found: $wasmLibPath"
    }

    if (-not (Test-Path $scriptsPath)) {
        throw "Scripts-folder not found: $scriptsPath"
    }

    if (-not (Test-Path $postBuildFile)) {
        throw "Post-build script not found: $postBuildFile"
    }

    if (-not (Test-Path $distPath)) {
        New-Item -ItemType Directory -Path $distPath | Out-Null
    }

    $wasmPack = Get-Command 'wasm-pack.exe' -ErrorAction Stop;
    $node = Get-Command 'node.exe' -ErrorAction Stop;

    Push-Location $wasmLibPath
    try {
        & $wasmPack.Source build `
            --target no-modules `
            --out-dir $distPath `
            --out-name 'fluexgl-dsp-wasm'

        if ($LASTEXITCODE -ne 0) {
            throw "wasm-pack failed with exit code: $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }

    Push-Location $scriptsPath
    try {
        & $node.Source $postBuildFile

        if ($LASTEXITCODE -ne 0) {
            throw "Node post-build script failed with exit-code: $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }

    Write-Host "Succesfully executed build pipeline." -ForegroundColor Green
}
catch {
    Write-Error "An error has occured while executing the build pipeline: $_"
    exit 1
}
