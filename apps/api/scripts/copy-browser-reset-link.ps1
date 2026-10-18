$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$sinkKeyFile = Join-Path $repoRoot '.env.browser-test.local'
$resetUrl = $null

try {
  $line = Get-Content -LiteralPath $sinkKeyFile -Raw
  if ($line -notmatch '^LOCAL_PASSWORD_RESET_SINK_KEY=([A-Za-z0-9_-]{43})$') { throw 'The local reset sink is not configured.' }
  $headers = @{ Origin = 'http://localhost:3000' }
  $email = 'jurismind-browser-acceptance@example.invalid'
  $body = @{ email = $email } | ConvertTo-Json -Compress
  $null = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/auth/password-reset/request' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 10

  $sinkHeaders = @{ Authorization = "Bearer $($Matches[1])" }
  $messages = @()
  for ($attempt = 0; $attempt -lt 20 -and $messages.Count -eq 0; $attempt++) {
    Start-Sleep -Milliseconds 100
    $sinkHeaders['Origin'] = 'http://localhost:3000'
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/auth/dev/password-reset-sink/read' -Method Post -Headers $sinkHeaders -TimeoutSec 10
    $messages = @($response.messages)
  }
  $message = $messages | Where-Object { $_.to -eq $email } | Select-Object -Last 1
  if (-not $message -or $message.resetUrl -notmatch '^http://localhost:3000/pages/auth/reset-password#token=[A-Za-z0-9_-]{43}$') {
    throw 'The local sink did not return a valid reset link for the synthetic account.'
  }
  $resetUrl = $message.resetUrl
  Set-Clipboard -Value $resetUrl
  Write-Host 'The synthetic account reset link was copied to the clipboard. Paste it into the local browser; do not paste it into chat, logs, or a ticket.'
}
catch {
  Write-Error 'Could not capture a reset link. Check that the development API and local sink are running; no secret value was displayed.'
  exit 1
}
finally {
  $resetUrl = $null
  $messages = $null
  $response = $null
  $sinkHeaders = $null
}
