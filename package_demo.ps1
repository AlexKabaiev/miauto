# Оболонка запуску скрипта пакування демо-релізу MIAUTO
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$PSScriptRoot\.venv\Scripts\python.exe" "$PSScriptRoot\package_demo.py"
