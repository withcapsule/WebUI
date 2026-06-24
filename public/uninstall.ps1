$ErrorActionPreference = "Stop"

$InstDir = "$env:LOCALAPPDATA\Programs\capsule"
$Dest    = "$InstDir\capsule.exe"

if (Test-Path $Dest) {
    Remove-Item $Dest -Force
    Write-Host "Removed $Dest"
} else {
    Write-Host "capsule not found at $Dest"
}

$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -ne $UserPath -and $UserPath -like "*$InstDir*") {
    $NewPath = ($UserPath -split ";" | Where-Object { $_ -ne $InstDir }) -join ";"
    [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
    Write-Host "Removed $InstDir from your PATH (restart your terminal for changes to take effect)."
}

if ((Test-Path $InstDir) -and (Get-ChildItem $InstDir -Force | Measure-Object).Count -eq 0) {
    Remove-Item $InstDir -Force
}
