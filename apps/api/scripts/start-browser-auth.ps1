$ErrorActionPreference = 'Stop'
$apiRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $apiRoot '..\..')).Path
$sinkKeyFile = Join-Path $repoRoot '.env.browser-test.local'

Push-Location $apiRoot
try {
  $testUrl = & node -r dotenv/config -e 'const u=new URL(process.env.DATABASE_URL||""); if(!["postgres:","postgresql:"].includes(u.protocol)||!(["localhost","127.0.0.1","::1"].includes(u.hostname))||u.pathname!=="/jurismind_dev") process.exit(4); u.pathname="/jurismind_auth_test"; process.stdout.write(u.toString())'
  if ($LASTEXITCODE -ne 0 -or -not $testUrl) { throw 'Could not safely derive the isolated local test target from the existing API configuration.' }

  if (-not (Test-Path -LiteralPath $sinkKeyFile)) {
    $newSinkKey = & node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))'
    if ($LASTEXITCODE -ne 0 -or $newSinkKey -notmatch '^[A-Za-z0-9_-]{43}$') { throw 'Could not generate the local sink access key.' }
    [System.IO.File]::WriteAllText($sinkKeyFile, "LOCAL_PASSWORD_RESET_SINK_KEY=$newSinkKey", [System.Text.UTF8Encoding]::new($false))
    $acl = Get-Acl -LiteralPath $sinkKeyFile
    $acl.SetAccessRuleProtection($true, $false)
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'Allow')
    $acl.SetAccessRule($rule)
    Set-Acl -LiteralPath $sinkKeyFile -AclObject $acl
  }

  $line = Get-Content -LiteralPath $sinkKeyFile -Raw
  if ($line -notmatch '^LOCAL_PASSWORD_RESET_SINK_KEY=([A-Za-z0-9_-]{43})$') { throw 'The ignored local sink-key file has an invalid format.' }
  $sinkKey = $Matches[1]

  $env:DATABASE_URL = $testUrl
  $env:AUTH_TEST_DATABASE_URL = $testUrl
  $verifiedDatabase = & node -e 'const {Client}=require("pg"); (async()=>{const names=[]; for(const connectionString of [process.env.DATABASE_URL,process.env.AUTH_TEST_DATABASE_URL]) { const c=new Client({connectionString}); await c.connect(); try { const r=await c.query("SELECT current_database() AS name"); names.push(r.rows[0]?.name); } finally { await c.end(); } } if(names.length!==2||names.some(n=>n!=="jurismind_auth_test")) process.exit(4); process.stdout.write(names[0]); })().catch(()=>process.exit(5));'
  if ($LASTEXITCODE -ne 0 -or $verifiedDatabase -ne 'jurismind_auth_test') { throw 'Both process database connections must resolve to jurismind_auth_test.' }
  $env:NODE_ENV = 'development'
  $env:PORT = '4000'
  $env:TRUSTED_ORIGINS = 'http://localhost:3000'
  $env:PUBLIC_WEB_URL = 'http://localhost:3000'
  $env:SESSION_TTL_SECONDS = '43200'
  $env:PASSWORD_MIN_LENGTH = '12'
  $env:LOGIN_RATE_LIMIT_MAX = '5'
  $env:LOGIN_RATE_LIMIT_WINDOW_SECONDS = '900'
  $env:MFA_ENCRYPTION_KEY = & node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))'
  $env:LOCAL_PASSWORD_RESET_SINK_ENABLED = 'true'
  $env:LOCAL_PASSWORD_RESET_SINK_KEY = $sinkKey
  $env:PASSWORD_RESET_EMAIL_ENDPOINT = ''
  $env:PASSWORD_RESET_EMAIL_API_KEY = ''
  $env:PASSWORD_RESET_EMAIL_FROM = ''

  Write-Host 'Starting API against the verified local auth-test database. The MFA key is process-only; the reset sink key is in a user-only ignored local file.'
  npm run dev
}
finally {
  Remove-Item Env:DATABASE_URL, Env:AUTH_TEST_DATABASE_URL, Env:MFA_ENCRYPTION_KEY, Env:LOCAL_PASSWORD_RESET_SINK_KEY -ErrorAction SilentlyContinue
  Pop-Location
}
