$ErrorActionPreference = 'Stop'
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataRoot = Join-Path $toolRoot '.data'
$stdoutLog = Join-Path $dataRoot 'admin-server.log'
$stderrLog = Join-Path $dataRoot 'admin-server-error.log'
$port = $null
$server = $null

Set-Location -LiteralPath $toolRoot
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null

foreach ($candidate in 4177..4197) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
    $listener.Start()
    $port = $candidate
    break
  } catch { }
  finally { if ($listener) { $listener.Stop() } }
}
if (-not $port) { throw 'No free local admin port was found between 4177 and 4197.' }

$secure = Read-Host 'Create the admin password for this session' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }

if ([string]::IsNullOrWhiteSpace($password)) {
  throw 'The admin password cannot be empty.'
}

$env:GMATHS_ADMIN_PASSWORD = $password
$env:PORT = $port

try {
  $server = Start-Process -FilePath 'node' -ArgumentList @('server.js') `
    -WorkingDirectory $toolRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 200
    if ($server.HasExited) { break }
    try {
      $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/api/session" -TimeoutSec 1
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }

  if (-not $ready) {
    $details = if (Test-Path $stderrLog) { Get-Content -Raw $stderrLog } else { 'No server error log was created.' }
    throw "The local admin server could not start.`n$details"
  }

  Write-Host ''
  Write-Host "Admin server is ready: http://127.0.0.1:$port" -ForegroundColor Green
  Write-Host 'Use the same password you entered in this window to unlock the browser page.'
  Write-Host 'Keep this window open while using the admin tool.'
  Start-Process "http://127.0.0.1:$port"
  Read-Host 'Press Enter here when you want to stop the admin server'
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item Env:GMATHS_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
}
