# Resolves the project's root directory,
$projectRootDirectory = Join-Path -Path $PSScriptRoot -ChildPath "../../";

# Resolves the Webpack configuration file path.
$webpackConfigurationFile = Join-Path -Path $projectRootDirectory -ChildPath "webpack.config.ts";

# Safe checking if the file exists.
if(-not (Get-Item $webpackConfigurationFile)) {
    Write-Host "Could not access Webpack configuration file, because it has not been located in the root directory.";
    exit;
}

# Build the Webpack configuration file.
npx tsc $webpackConfigurationFile -esModuleInterop -allowSyntheticDefaultImports -module CommonJS;