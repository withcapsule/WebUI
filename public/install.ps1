$ErrorActionPreference = "Stop"

$InstDir = "$env:LOCALAPPDATA\Programs\capsule"

$Arch = $env:PROCESSOR_ARCHITECTURE
$Target = switch ($Arch) {
    "ARM64" { "aarch64-windows" }
    "AMD64" { "x86_64-windows" }
    default {
        Write-Error "Unsupported architecture: $Arch"
        exit 1
    }
}

$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/withcapsule/CLI/releases/latest"
$Version = $Release.tag_name
if (-not $Version) {
    Write-Error "Could not fetch latest version"
    exit 1
}

$Url  = "https://github.com/withcapsule/CLI/releases/download/$Version/capsule-$Target.exe"
$Dest = "$InstDir\capsule.exe"

New-Item -ItemType Directory -Force -Path $InstDir | Out-Null

Write-Host "Installing capsule $Version ($Target)..."
Invoke-WebRequest -Uri $Url -OutFile $Dest

$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -eq $UserPath) { $UserPath = "" }
if ($UserPath -notlike "*$InstDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$UserPath;$InstDir", "User")
    Write-Host "Added $InstDir to your PATH (restart your terminal for changes to take effect)."
}

Write-Host "Installed capsule to $Dest"
