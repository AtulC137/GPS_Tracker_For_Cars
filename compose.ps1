# Docker Compose wrapper — loads backend and frontend .env files.
# Usage: .\compose.ps1 up --build
#        .\compose.ps1 up-phone-mqtt
#        .\compose.ps1 ps
#        .\compose.ps1 logs core

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$envFiles = @(
    "--env-file", "$Root/backend/.env",
    "--env-file", "$Root/frontend/gps-tracker-for-cars/.env"
)

$preset = $args[0]
$rest = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }

switch ($preset) {
    "up-phone-mqtt" {
        docker compose @envFiles --profile phone --profile mqtt up -d --build @rest
    }
    "ps" {
        docker compose @envFiles ps @rest
    }
    "logs" {
        if ($rest.Count -gt 0 -and $rest[0] -eq "core") {
            $tailArgs = if ($rest.Count -gt 1) { $rest[1..($rest.Count - 1)] } else { @() }
            docker compose @envFiles logs postgres backend frontend @tailArgs
        } else {
            docker compose @envFiles logs @rest
        }
    }
    default {
        docker compose @envFiles @args
    }
}
