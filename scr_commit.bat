@echo off
setlocal

set "msg=%*"

if "%msg%"=="" (
    set /p msg=Podaj opis zmiany: 
)

if "%msg%"=="" (
    echo Opis zmiany nie moze byc pusty.
    exit /b 1
)

if not exist .git (
    echo Ten folder nie jest repozytorium Git. Najpierw uruchom: git init
    exit /b 1
)

git status
git add .
git commit -m "%msg%"
git push