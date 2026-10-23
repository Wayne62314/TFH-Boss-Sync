param([string]$Python='python')
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    $syncOldLogs=Join-Path $PSScriptRoot 'dist/TFH-Boss-Sync/logs'
    if(Test-Path -LiteralPath $syncOldLogs){
        $syncBackup=Join-Path $PSScriptRoot ('logs/build-backups/'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
        New-Item -ItemType Directory -Path $syncBackup -Force | Out-Null
        Copy-Item -LiteralPath $syncOldLogs -Destination $syncBackup -Recurse
    }
    $syncData=@()
    foreach($syncFile in @('boss-policy.js','boss-hook.js','velvet-balance-policy.js','velvet-input.js','oleander-balance-policy.js','oleander-input.js','oleander-damage.js','oleander-entry-guard.js','README.md','README.zh-CN.md','MOVES.en.md','MOVES.zh-CN.md')){
        $syncData+=@('--add-data',((Join-Path $PSScriptRoot $syncFile)+':.'))
    }
    & $Python -m PyInstaller --noconfirm --onedir --windowed --noupx --name TFH-Boss-Sync --collect-all frida @syncData --distpath dist --workpath build --specpath build app.py
    if($LASTEXITCODE -ne 0){throw 'Build failed'}
    $syncExe=Join-Path $PSScriptRoot 'dist/TFH-Boss-Sync/TFH-Boss-Sync.exe'
    foreach($syncCheck in @('--self-test','--ui-self-test')){
        $syncProcess=Start-Process -FilePath $syncExe -ArgumentList $syncCheck -WindowStyle Hidden -PassThru -Wait
        if($syncProcess.ExitCode -ne 0){throw "Portable test failed: $syncCheck"}
    }
    & $Python package_release.py
    if($LASTEXITCODE -ne 0){throw 'Packaging failed'}
} finally {Pop-Location}
