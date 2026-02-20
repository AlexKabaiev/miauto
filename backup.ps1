# Путь к папке, где будут лежать бэкапы (рядом с проектом)
$BackupDir = Join-Path (Get-Item .).Parent.FullName "MIAUTO_Backups"
if (!(Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir }

# Формируем имя файла с датой: MIAUTO_2024-02-20_19-30.zip
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ZipFile = Join-Path $BackupDir "MIAUTO_$Timestamp.zip"

Write-Host "--- Начинаю создание резервной копии ---" -ForegroundColor Cyan
Write-Host "Папка бэкапов: $BackupDir"

# Список исключений (что не кладем в архив, чтобы он был легким)
$Exclude = @(
    "node_modules",
    ".venv",
    ".git",
    "dist",
    ".vite",
    "__pycache__",
    ".agents"
)

# Выполняем архивацию через 7-Zip (если есть) или штатный PowerShell
# Здесь используем штатный Compress-Archive
Get-ChildItem -Path . -Exclude $Exclude | Compress-Archive -DestinationPath $ZipFile -Force

Write-Host "Готово! Резервная копия создана: $ZipFile" -ForegroundColor Green
Write-Host "База данных включена в архив." -ForegroundColor Yellow
