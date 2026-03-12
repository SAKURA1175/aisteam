$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot
$env:SPRING_PROFILES_ACTIVE = "local"
mvn spring-boot:run
