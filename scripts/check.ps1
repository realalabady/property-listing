$urls = @(
  @{ Path = "/"; ExpectMatch = "Run your entire real estate"; ExpectStatus = 200 },
  @{ Path = "/login"; ExpectMatch = "Sign in"; ExpectStatus = 200 },
  @{ Path = "/dashboard"; ExpectMatch = $null; ExpectStatus = 307 },
  @{ Path = "/admin"; ExpectMatch = $null; ExpectStatus = 307 }
)

foreach ($u in $urls) {
  $uri = "http://localhost:3000" + $u.Path
  try {
    $resp = Invoke-WebRequest -Uri $uri -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    $code = $resp.StatusCode
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $resp = $null
  }

  $matched = $true
  if ($u.ExpectMatch -and $resp) {
    $matched = $resp.Content -match $u.ExpectMatch
  }

  $ok = ($code -eq $u.ExpectStatus) -and $matched
  $statusIcon = if ($ok) { "[OK]" } else { "[FAIL]" }
  Write-Host "$statusIcon $($u.Path) -> status=$code expected=$($u.ExpectStatus) match=$matched"
}
