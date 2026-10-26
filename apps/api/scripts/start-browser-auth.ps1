$ErrorActionPreference = 'Stop'
$apiRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $apiRoot '..\..')).Path
$sinkKeyFile = Join-Path $repoRoot '.env.browser-test.local'
$keysFile = Join-Path $repoRoot '.env.browser-keys.local'
$databaseHelper = Join-Path $PSScriptRoot 'browser-auth-database.cjs'

function Protect-LocalFile([string]$path) {
  $acl = Get-Acl -LiteralPath $path
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'Allow')
  $acl.SetAccessRule($rule)
  Set-Acl -LiteralPath $path -AclObject $acl
}

function Read-LocalKey([string[]]$lines, [string]$name) {
  $prefix = "$name="
  foreach ($line in $lines) {
    if ($line.StartsWith($prefix) -and $line.Substring($prefix.Length) -match '^[A-Za-z0-9+/]{43}=$') {
      return $line.Substring($prefix.Length)
    }
  }
  throw "The ignored local key file is missing a valid $name."
}

Push-Location $apiRoot
try {
  $verifiedDatabase = & node -r dotenv/config $databaseHelper verify-dev
  if ($LASTEXITCODE -ne 0 -or $verifiedDatabase -ne 'jurismind_dev') { throw 'The API configuration must resolve to local jurismind_dev for browser testing.' }

  if (-not (Test-Path -LiteralPath $sinkKeyFile)) {
    $newSinkKey = & node $databaseHelper random-base64url
    if ($LASTEXITCODE -ne 0 -or $newSinkKey -notmatch '^[A-Za-z0-9_-]{43}$') { throw 'Could not generate the local sink access key.' }
    [System.IO.File]::WriteAllText($sinkKeyFile, "LOCAL_PASSWORD_RESET_SINK_KEY=$newSinkKey", [System.Text.UTF8Encoding]::new($false))
    Protect-LocalFile $sinkKeyFile
  }

  $line = Get-Content -LiteralPath $sinkKeyFile -Raw
  if ($line -notmatch '^LOCAL_PASSWORD_RESET_SINK_KEY=([A-Za-z0-9_-]{43})$') { throw 'The ignored local sink-key file has an invalid format.' }
  $sinkKey = $Matches[1]

  $env:NODE_ENV = 'development'
  $env:PORT = '4000'
  $env:TRUSTED_ORIGINS = 'http://localhost:3000'
  $env:PUBLIC_WEB_URL = 'http://localhost:3000'
  $env:SESSION_TTL_SECONDS = '43200'
  $env:PASSWORD_MIN_LENGTH = '12'
  $env:LOGIN_RATE_LIMIT_MAX = '5'
  $env:LOGIN_RATE_LIMIT_WINDOW_SECONDS = '900'
  $env:INVITATION_DEV_TOKEN_DELIVERY = 'true'
  # MFA secrets and professional-card identifiers are encrypted at rest, so the keys must
  # outlive one API process: regenerating them on every launch leaves previously stored rows
  # unreadable for the account owner and for reviewers. They are kept in a user-only, ignored
  # local file, exactly like the reset-sink key.
  if (-not (Test-Path -LiteralPath $keysFile)) {
    $newMfaKey = & node $databaseHelper random-base64
    $newCredentialKey = & node $databaseHelper random-base64
    if ($LASTEXITCODE -ne 0 -or -not $newMfaKey -or -not $newCredentialKey) { throw 'Could not generate the local encryption keys.' }
    [System.IO.File]::WriteAllText($keysFile, "MFA_ENCRYPTION_KEY=$newMfaKey`nLAWYER_CREDENTIAL_ENCRYPTION_KEY=$newCredentialKey", [System.Text.UTF8Encoding]::new($false))
    Protect-LocalFile $keysFile
  }
  $keyLines = Get-Content -LiteralPath $keysFile
  $env:MFA_ENCRYPTION_KEY = Read-LocalKey $keyLines 'MFA_ENCRYPTION_KEY'
  # Lawyer-card identifiers are encrypted with a separate 32-byte key; without it the
  # credential-verification endpoints fail closed with 503 during browser acceptance.
  $env:LAWYER_CREDENTIAL_ENCRYPTION_KEY = Read-LocalKey $keyLines 'LAWYER_CREDENTIAL_ENCRYPTION_KEY'
  if ($env:MFA_ENCRYPTION_KEY -eq $env:LAWYER_CREDENTIAL_ENCRYPTION_KEY) { throw 'The local MFA and lawyer-credential encryption keys must be distinct.' }
  $env:LOCAL_PASSWORD_RESET_SINK_ENABLED = 'true'
  $env:LOCAL_PASSWORD_RESET_SINK_KEY = $sinkKey
  $env:PASSWORD_RESET_EMAIL_ENDPOINT = ''
  $env:PASSWORD_RESET_EMAIL_API_KEY = ''
  $env:PASSWORD_RESET_EMAIL_FROM = ''

  Write-Host 'Starting API against the verified local jurismind_dev database. Encryption and reset-sink keys are read from user-only ignored local files, so restarts keep encrypted records readable.'
  npm run dev
}
finally {
  Remove-Item Env:INVITATION_DEV_TOKEN_DELIVERY, Env:MFA_ENCRYPTION_KEY, Env:LAWYER_CREDENTIAL_ENCRYPTION_KEY, Env:LOCAL_PASSWORD_RESET_SINK_KEY -ErrorAction SilentlyContinue
  Pop-Location
}
