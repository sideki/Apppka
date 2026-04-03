# Raport Pracy - PRD

## Opis
Aplikacja mobilna (Expo + web) do tworzenia raportów dziennych pracy. Admin zarządza pytaniami i ustawieniami, użytkownik odpowiada na pytania i generuje raporty.

## Konta
- **Admin**: Zarządza pytaniami, ustawieniami powiadomień, przeglada raporty
- **Pracownik**: Wypełnia raporty, przegląda historię, eksportuje PDF

## Funkcje
1. **Pytania**: 3 kategorie - codzienne, sobotnie, pierwsza sobota miesiąca
2. **Raporty**: Tworzenie, zamykanie, przeglądanie, eksport PDF
3. **Powiadomienia**: Lokalne, o ustawionej godzinie
4. **PDF**: Format: Data DD/MM/RRRR, RAPORT PRACY, Pytanie:Odpowiedź
5. **Zabezpieczenia**: Nie można otworzyć nowego raportu bez zamknięcia poprzedniego

## Design
Elegancki minimalizm modernistyczny. Żółty (#FFC300) z granatowymi (#0A192F) wstawkami.

## Tech Stack
- Backend: FastAPI + MongoDB + JWT Auth
- Frontend: Expo (React Native) + expo-router
- PDF: expo-print + expo-sharing
- Powiadomienia: expo-notifications
