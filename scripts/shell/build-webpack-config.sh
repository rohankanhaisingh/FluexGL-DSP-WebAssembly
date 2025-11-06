#!/bin/bash

# Resolve the project's root directory
projectRootDirectory="$(dirname "$(realpath "$0")")/..../"

# Resolve the Webpack configuration file path
webpackConfigurationFile="$projectRootDirectory/webpack.config.ts"

# Safe checking if the file exists
if [ ! -f "$webpackConfigurationFile" ]; then
  echo "Could not access Webpack configuration file, because it has not been located in the root directory."
  exit 1
fi

chmod 755 $webpackConfigurationFile

# Build the Webpack configuration file
npx tsc "$webpackConfigurationFile" --esModuleInterop --allowSyntheticDefaultImports --module CommonJS
