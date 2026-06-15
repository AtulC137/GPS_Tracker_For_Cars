# Smoke-test OwnTracks HTTP ingest via ngrok.
# Usage: .\scripts\test-owntracks-ingest.ps1
#        .\scripts\test-owntracks-ingest.ps1 -Tid ZZ

param(
    [string]$Tid = "AT"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root "backend\.env"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing backend/.env — copy backend/.env.example first."
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_ -split '=', 2
    $envVars[$name.Trim()] = $value.Trim()
}

$domain = $envVars["NGROK_DOMAIN"]
$token = $envVars["INGEST_TOKEN"]

if (-not $domain) {
    Write-Error "NGROK_DOMAIN is not set in backend/.env"
}

$url = "https://$domain/api/v1/ingest/owntracks"
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$body = @{
    _type = "location"
    lat   = 18.52
    lon   = 73.85
    vel   = 0
    cog   = 0
    tst   = $timestamp
    tid   = $Tid
} | ConvertTo-Json -Compress

Write-Host "POST $url (tid=$Tid)"

$headers = @{ "Content-Type" = "application/json" }
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    $status = $response.StatusCode
    $content = $response.Content
}
catch {
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
    }
    else {
        Write-Host "FAIL: tunnel unreachable — is ngrok running? (.\compose.ps1 --profile phone up -d)"
        throw
    }
}

Write-Host "Status: $status"
Write-Host "Body:   $content"

if ($status -eq 200 -and $content -eq "[]") {
    Write-Host "PASS: OwnTracks HTTP ingest accepted (200 + [])"
    exit 0
}

if ($status -eq 401) {
    Write-Host "FAIL: unauthorized — set Authorization: Bearer <INGEST_TOKEN> in OwnTracks HTTP headers"
    exit 1
}

if ($status -eq 404) {
    Write-Host "FAIL: unknown device — enable AUTO_REGISTER_OWTRACKS_PHONES or register phone-$Tid in the database"
    exit 1
}

Write-Host "FAIL: unexpected response"
exit 1
