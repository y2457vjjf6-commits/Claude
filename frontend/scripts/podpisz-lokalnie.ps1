<#
    Podpisanie pliku Lechrol-WZ-*.exe certyfikatem Code Signing.

    Do użycia na komputerze z Windows, gdy certyfikat jest na tokenie USB,
    karcie kryptograficznej albo w chmurze (np. Certum SimplySign) — czyli
    wtedy, gdy klucza nie da się wywieźć do serwera budującego.

    Przygotowanie (raz):
      1. Zainstaluj sterowniki tokena / aplikację SimplySign i zaloguj się.
      2. Zainstaluj Windows SDK (zawiera signtool.exe) — https://aka.ms/windowssdk

    Użycie:
      .\podpisz-lokalnie.ps1 -Plik "C:\Users\...\Lechrol-WZ-1.1.0.exe"

    Skrypt sam znajdzie certyfikat Code Signing dostępny w systemie.
    Gdy jest ich kilka, wskaż odcisk palca:
      .\podpisz-lokalnie.ps1 -Plik "..." -Odcisk "AB12...CD"
#>

param(
    [Parameter(Mandatory = $true)][string]$Plik,
    [string]$Odcisk,
    [string]$SerwerCzasu = 'http://time.certum.pl'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Plik)) { throw "Nie znaleziono pliku: $Plik" }

# signtool.exe z Windows SDK
$signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signtool) {
    throw 'Nie znaleziono signtool.exe. Zainstaluj Windows SDK: https://aka.ms/windowssdk'
}

# Certyfikat do podpisywania kodu z magazynu użytkownika
if ($Odcisk) {
    $args = @('sign', '/sha1', $Odcisk)
} else {
    $certy = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
    if ($certy.Count -eq 0) {
        throw 'Nie znaleziono certyfikatu Code Signing. Zaloguj się do tokena / SimplySign i spróbuj ponownie.'
    }
    if ($certy.Count -gt 1) {
        Write-Host 'Dostępne certyfikaty:'
        $certy | ForEach-Object { Write-Host "  $($_.Thumbprint)  $($_.Subject)" }
        throw 'Kilka certyfikatów — uruchom ponownie z parametrem -Odcisk.'
    }
    Write-Host "Certyfikat: $($certy[0].Subject)"
    $args = @('sign', '/sha1', $certy[0].Thumbprint)
}

$args += @('/fd', 'sha256', '/tr', $SerwerCzasu, '/td', 'sha256', '/v', $Plik)

& $signtool.FullName @args
if ($LASTEXITCODE -ne 0) { throw "Podpisywanie nie powiodło się (kod $LASTEXITCODE)." }

$podpis = Get-AuthenticodeSignature $Plik
Write-Host ''
Write-Host "Status podpisu: $($podpis.Status)"
Write-Host "Podpisano przez: $($podpis.SignerCertificate.Subject)"
if ($podpis.Status -ne 'Valid') { throw 'Podpis nie jest prawidłowy.' }
Write-Host 'Gotowe — plik jest podpisany.'
