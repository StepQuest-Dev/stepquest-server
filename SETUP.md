# 🛠️ Instrukcja Konfiguracji Lokalnej (StepQuest)

Witaj w zespole **StepQuest**! Postępuj zgodnie z poniższymi krokami,
aby uruchomić pełne środowisko deweloperskie (Backend + Frontend + Baza
danych) na swoim komputerze.

------------------------------------------------------------------------

## 1. Wymagania wstępne

Upewnij się, że masz zainstalowane poniższe narzędzia:

-   **Node.js** (zalecana wersja LTS)
-   **Docker & Docker Desktop** (niezbędne do bazy danych PostgreSQL)
-   **Git**
-   **Środowisko React Native**:
    -   Dla Androida: Android Studio + Emulator/Telefon
    -   Dla iOS: Xcode (tylko na macOS)

------------------------------------------------------------------------

## 2. Klonowanie i Pierwsze Kroki

Sklonuj repozytorium i wejdź do folderu projektu:

``` bash
git clone https://gitlab.com/dzony03/stepquest.git
cd stepquest
```

ewentualnie przez SSH
``` bash
git clone git@gitlab.com:dzony03/stepquest.git
```
------------------------------------------------------------------------
## 2.5 Dodawanie lokalnie użytkownika do projektu (Opcjonalne)

W folderze głównym projektu
``` bash
git config --local user.name "twoja nazwa po @ z gitlab"
git config --local user.email "twoj mail gitlab"
```
------------------------------------------------------------------------

## 3. Zmienne Środowiskowe (.env)

Musimy ręcznie stworzyć pliki konfiguracyjne, których nie ma w systemie
kontroli wersji (są w `.gitignore`).

------------------------------------------------------------------------

## 4. Instalacja Zależności

Musisz zainstalować paczki `node_modules` dla obu części projektu:

``` bash
# Instalacja dla Backendu
cd backend
npm install

# Instalacja dla Frontendu
cd ../frontend
npm install
```

------------------------------------------------------------------------

## 5. Uruchomienie Bazy Danych (Docker)

Uruchom kontener z bazą PostgreSQL. Docker automatycznie utworzy folder
`postgres_data` (jest on ignorowany przez Git).

``` bash
# Będąc w głównym folderze projektu (stepquest/):
docker-compose up -d
```

Możesz sprawdzić status komendą:

``` bash
docker ps
```

------------------------------------------------------------------------

## 6. Synchronizacja Bazy Danych (Prisma)

Teraz musimy wgrać strukturę tabel (schemat RPG) do nowo uruchomionej
bazy w Dockerze:

``` bash
cd backend
npx prisma generate
npx prisma db push
```

------------------------------------------------------------------------

## 7. Uruchomienie Projektu

### Start Backendu (NestJS)

Otwórz nowy terminal w folderze `backend/`:

``` bash
npm run start:dev
```

Serwer będzie dostępny pod adresem:\
**http://localhost:3000**

### Start Frontendu (React Native)

npx expo start --tunnel

------------------------------------------------------------------------

# ⚠️ Rozwiązywanie problemów (FAQ)

### Błąd: `Port 5432 is already in use`

Masz prawdopodobnie zainstalowanego PostgreSQL bezpośrednio w systemie.
Wyłącz usługę systemową lub zmień port w `docker-compose.yml`.

### Zmiana schematu bazy danych

Jeśli ktoś z zespołu zmieni plik `schema.prisma`, po pobraniu zmian
(`git pull`) musisz ponownie uruchomić:

``` bash
npx prisma db push
```

w folderze `backend/`.

### Błędy z kluczem SSH

Jeśli `git clone` nie działa, upewnij się, że dodałeś swój klucz
publiczny SSH w ustawieniach profilu na GitLab:

**Settings → SSH Keys**
