function Set-Or-AddEnvVar {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$Value
  )

  if (-not (Test-Path $Path)) {
    New-Item -ItemType File -Path $Path | Out-Null
  }

  $content = Get-Content $Path -Raw
  $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
  $replacement = "$Key=$Value"

  if ([regex]::IsMatch($content, $pattern)) {
    $updated = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{
      param($match)
      $replacement
    }, 1)
    Set-Content -Path $Path -Value $updated
  } else {
    if ($content -and -not $content.EndsWith("`n")) {
      Add-Content -Path $Path -Value ""
    }
    Add-Content -Path $Path -Value $replacement
  }
}

Write-Output "Enter SMTP settings. Values are written to .env.local and .env."

$hostValue = Read-Host "SMTP_HOST (e.g. smtp.resend.com)"
$portValue = Read-Host "SMTP_PORT (465 or 587)"
$secureValue = Read-Host "SMTP_SECURE (true/false)"
$userValue = Read-Host "SMTP_USER"
$passSecure = Read-Host "SMTP_PASS (input hidden)" -AsSecureString
$fromValue = Read-Host "EMAIL_FROM (e.g. Listing Property <noreply@yourdomain.com>)"

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passSecure)
try {
  $passValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$files = @(".env.local", ".env")
foreach ($file in $files) {
  Set-Or-AddEnvVar -Path $file -Key "SMTP_HOST" -Value $hostValue
  Set-Or-AddEnvVar -Path $file -Key "SMTP_PORT" -Value $portValue
  Set-Or-AddEnvVar -Path $file -Key "SMTP_SECURE" -Value $secureValue
  Set-Or-AddEnvVar -Path $file -Key "SMTP_USER" -Value $userValue
  Set-Or-AddEnvVar -Path $file -Key "SMTP_PASS" -Value $passValue
  Set-Or-AddEnvVar -Path $file -Key "EMAIL_FROM" -Value $fromValue
}

Write-Output "SMTP values saved."
