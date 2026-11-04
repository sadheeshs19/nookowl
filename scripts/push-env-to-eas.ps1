# Copies the EXPO_PUBLIC_* values from .env.local into EAS, so cloud builds get them.
# Run from the project folder:  powershell -ExecutionPolicy Bypass -File scripts\push-env-to-eas.ps1
$lines = Get-Content .env.local | Where-Object { $_ -match '^\s*EXPO_PUBLIC_[A-Z_]+=.+' }
foreach ($line in $lines) {
  $name, $value = $line.Trim() -split '=', 2
  $value = $value.Trim().Trim('"')
  if (-not $value) { continue }
  foreach ($envName in @('production', 'preview', 'development')) {
    Write-Host "Setting $name for $envName"
    npx eas-cli@latest env:create --name $name --value $value --environment $envName --visibility plaintext --force --non-interactive
  }
}
Write-Host "Done. Check with: npx eas-cli@latest env:list --environment production"
