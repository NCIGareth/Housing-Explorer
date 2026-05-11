@echo off
set ESLINT_USE_FLAT_CONFIG=false
node "%~dp0..\apps\web\node_modules\eslint\bin\eslint.js" %*
