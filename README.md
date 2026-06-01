# StepQuest - Backend Server

Serwer API dla gry StepQuest, zbudowany w oparciu o architekturę mikroserwisów z wykorzystaniem frameworka NestJS. Obsługuje logikę gry, autoryzację, sesje walki oraz trwałość danych.

## 🏗 Architektura i Technologie

-   **Framework**: NestJS (TypeScript)
-   **ORM**: Prisma
-   **Baza Danych**: PostgreSQL
-   **Cache & Real-time**: Redis (używany do zarządzania aktywnymi sesjami walki)
-   **Bezpieczeństwo**: Passport JWT, Bcrypt, Helmet
-   **Walidacja**: Class-validator / Class-transformer

## ⚔️ Kluczowe Moduły

-   **Auth**: System rejestracji i logowania z autoryzacją JWT.
-   **Combat**: Silnik walki turowej zarządzający stanem bitwy w Redisie (chroni przed oszustwami i utratą postępu).
-   **Steps**: Przetwarzanie i agregacja danych o aktywności fizycznej gracza.
-   **Raids**: System asynchronicznych najazdów między osadami graczy.
-   **Places**: Logika odkrywania miejsc (POI) oparta o współrzędne geograficzne.

## 🚀 Szybki Start

1.  **Zainstaluj zależności**:
    ```bash
    npm install
    ```

2.  **Uruchom infrastrukturę (Docker)**:
    Upewnij się, że masz zainstalowany Docker, a następnie uruchom bazę danych i Redis:
    ```bash
    docker compose up -d
    ```

3.  **Skonfiguruj zmienne środowiskowe**:
    Skopiuj `.env.example` do `.env` i dostosuj dane połączenia (domyślne działają z Dockerem).

4.  **Przygotuj bazę danych**:
    ```bash
    # Wypchnij schemat do bazy
    npx prisma db push
    
    # Wypełnij bazę danymi startowymi (Klasy, Przeciwnicy)
    npx ts-node prisma/seed.ts
    ```

5.  **Uruchom serwer**:
    ```bash
    npm run start:dev
    ```
    Serwer będzie dostępny pod adresem: `http://localhost:3000/api/v1`

## 📁 Struktura Projektu

-   `src/auth`: Autoryzacja i zarządzanie kontem.
-   `src/combat`: Logika walki i encje bitew.
-   `src/steps`: Endpointy do synchronizacji kroków.
-   `src/raids`: System walk między graczami.
-   `prisma/`: Schemat bazy danych i skrypty seedujące.

---
© 2026 StepQuest Team
