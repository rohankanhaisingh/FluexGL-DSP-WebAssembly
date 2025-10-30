param(
    [string]$ReleasesDir = "$PSScriptRoot../releases",
    [string]$BaseName = "FluexGL-DSP-WebAssembly-release",
    [ValidateSet("Patch", "Minor", "Major")]
    [string]$Bump = "Patch",
    [switch]$CreateFile
);

$pattern = "^{0}-(\d+)\.(\d+)\.(\d+)\.zip$" -f [regex]::Escape($BaseName);

if (-not (Test-Path $ReleasesDir)) {
    throw "Directory does not exist: $ReleasesDir";
}

$versions =
Get-ChildItem -Path $ReleasesDir -Filter "*.zip" -File |
Where-Object { $_.Name -match $pattern } |
ForEach-Object {
    $m = [regex]::Match($_.Name, $pattern)
    [pscustomobject]@{
        File = $_.FullName
        Major = [int]$m.Groups[1].Value
        Minor = [int]$m.Groups[2].Value
        Patch = [int]$m.Groups[3].Value
        Version = [version]("{0}.{1}.{2}" -f $m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value)
    }
}

if ($versions.Count -gt 0) {
    $current = $versions | Sort-Object Version -Descending | Select-Object -First 1
    $major, $minor, $patch = $current.Major, $current.Minor, $current.Patch
} else {
    $major, $minor, $patch = 0, 0, 0
}

switch ($Bump) {
    "Major" { $major++; $minor = 0; $patch = 0 }
    "Minor" { $minor++; $patch = 0 }
    "Patch" { $patch++ }
}

$newVersion = "{0}.{1}.{2}" -f $major, $minor, $patch
$newName = "{0}-{1}.zip" -f $BaseName, $newVersion
$newPath = Join-Path $ReleasesDir $newName

[pscustomobject]@{
    ReleasesDir = $ReleasesDir
    BaseName = $BaseName
    Bump = $Bump
    NextVersion = $newVersion
    NextZip = $newPath
}

if ($CreateFile) {
    if (Test-Path $newPath) {
        Write-Warning "File already exists: $newPath";
    } else {
        $tmp = Join-Path $env:TEMP ("_empty_{0}" -f ([guid]::NewGuid().ToString("N")));
        New-Item -ItemType Directory -Path $tmp | Out-Null;
        try {
            Compress-Archive -Path "../_dist" -DestinationPath $newPath -Force
            Write-Host "Created: $newPath"
        } finally {
            Remove-Item $tmp -Recurse -Force
        }
    }
}