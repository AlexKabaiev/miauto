# Путь к папке, где будут лежать бэкапы (рядом с проектом)
$ProjectDir = Get-Item .
$BackupDir = Join-Path $ProjectDir.Parent.FullName "MIAUTO_Backups"
if (!(Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir }

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ZipFile = Join-Path $BackupDir "MIAUTO_$Timestamp.zip"
$TempDir = Join-Path $env:TEMP "MIAUTO_Backup_Temp_$Timestamp"

Write-Host "--- Начинаю создание резервной копии ---" -ForegroundColor Cyan

# Список исключений для копирования
$Exclude = @(
    "node_modules",
    ".venv",
    ".git",
    "dist",
    ".vite",
    "__pycache__",
    ".agents",
    "MIAUTO_Backups"
)

try {
    Write-Host "Подготовка временных файлов..." -ForegroundColor Gray
    if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $TempDir | Out-Null

    # Копируем всё кроме исключений во временную папку
    # Используем Robocopy для надежности (он умеет копировать открытые файлы лучше, если настроить, 
    # или просто пропустим заблокированные, но предупредим)
    Write-Host "Копирование файлов проекта..." -ForegroundColor Gray
    
    # Рекурсивное копирование с фильтрацией
    Get-ChildItem -Path . -Exclude $Exclude | ForEach-Object {
        $Dest = Join-Path $TempDir $_.Name
        Copy-Item -Path $_.FullName -Destination $Dest -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Создание архива..." -ForegroundColor Gray
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile -Force

    Write-Host "Очистка..." -ForegroundColor Gray
    Remove-Item -Path $TempDir -Recurse -Force

    Write-Host "Готово! Резервная копия создана: $ZipFile" -ForegroundColor Green
    Write-Host "База данных включена (если она не была эксклюзивно заблокирована)." -ForegroundColor Yellow
}
catch {
    Write-Host "ОШИБКА при создании бэкапа: $($_.Exception.Message)" -ForegroundColor Red
}
