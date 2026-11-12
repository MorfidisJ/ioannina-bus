$env:GRADLE_USER_HOME = "G:\.gradle"
$env:TEMP = "G:\temp"
$env:TMP = "G:\temp"

Set-Location "G:\ioannina-bus"
Write-Host "Building web assets..."
npm run build

Write-Host "Syncing Capacitor..."
npx cap sync android

Set-Location "G:\ioannina-bus\android"
Write-Host "Building APK with Gradle on G: drive..."
.\gradlew.bat -g "G:\.gradle" assembleDebug

$apkPath = "G:\ioannina-bus\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "SUCCESS: APK created at $apkPath" -ForegroundColor Green
    Copy-Item $apkPath "G:\ioannina-bus\ioannina-bus.apk" -Force
    Write-Host "Copied to G:\ioannina-bus\ioannina-bus.apk" -ForegroundColor Green
} else {
    Write-Host "Build finished. Checking APK..."
}

