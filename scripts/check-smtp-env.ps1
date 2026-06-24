$required = @('SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','EMAIL_FROM')

if (-not (Test-Path '.env')) {
  Write-Output 'ERROR: .env not found'
  exit 1
}

$lines = Get-Content .env
Write-Output '[.env SMTP validation]'

foreach ($key in $required) {
  $matches = $lines | Where-Object { $_ -match ('^' + [regex]::Escape($key) + '=') }

  if ($matches.Count -eq 0) {
    Write-Output "  ${key}: MISSING"
    continue
  }

  if ($matches.Count -gt 1) {
    Write-Output "  ${key}: DUPLICATE ($($matches.Count) entries)"
    continue
  }

  $value = ($matches[0] -split '=', 2)[1]
  $trimmed = $value.Trim()

  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    Write-Output "  ${key}: EMPTY"
    continue
  }

  switch ($key) {
    'SMTP_PORT' {
      $parsed = 0
      $isInt = [int]::TryParse($trimmed, [ref]$parsed)
      if (-not $isInt) {
        Write-Output "  ${key}: SET but INVALID (not an integer)"
      } elseif ($parsed -lt 1 -or $parsed -gt 65535) {
        Write-Output "  ${key}: SET but INVALID (out of range)"
      } else {
        Write-Output "  ${key}: SET and VALID"
      }
      continue
    }
    'SMTP_SECURE' {
      $ok = @('true','false','1','0','yes','no') -contains $trimmed.ToLower()
      if ($ok) {
        Write-Output "  ${key}: SET and VALID"
      } else {
        Write-Output "  ${key}: SET but INVALID (expected true/false/1/0/yes/no)"
      }
      continue
    }
    'EMAIL_FROM' {
      $plain = $trimmed -match '^[^\s@]+@[^\s@]+\.[^\s@]+$'
      $named = $trimmed -match '^.+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$'
      if ($plain -or $named) {
        Write-Output "  ${key}: SET and VALID"
      } else {
        Write-Output "  ${key}: SET but CHECK FORMAT (expected email or Name <email>)"
      }
      continue
    }
    default {
      Write-Output "  ${key}: SET"
      continue
    }
  }
}

Write-Output '[cross-check .env.local]'
if (Test-Path '.env.local') {
  $localLines = Get-Content .env.local
  foreach ($key in $required) {
    $m = $localLines | Where-Object { $_ -match ('^' + [regex]::Escape($key) + '=') }
    if ($m.Count -eq 0) {
      Write-Output "  .env.local ${key}: MISSING"
      continue
    }

    if ($m.Count -gt 1) {
      Write-Output "  .env.local ${key}: DUPLICATE ($($m.Count) entries)"
      continue
    }

    $v = (($m[0] -split '=',2)[1]).Trim()
    $state = if ([string]::IsNullOrWhiteSpace($v)) { 'EMPTY' } else { 'SET' }
    Write-Output "  .env.local ${key}: $state"
  }
} else {
  Write-Output '  .env.local not found'
}
