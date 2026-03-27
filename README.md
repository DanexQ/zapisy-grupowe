# Zapisy Grupowe

Pelnostosowa aplikacja do zapisow na projekty grupowe z backendem w FastAPI, frontendem w React oraz baza MySQL.

## Co zawiera

- liste otwartych projektow z wyszukiwaniem i filtrem liczby wolnych miejsc,
- rejestracje i logowanie uzytkownikow,
- tworzenie nowych projektow przez wlascicieli,
- strone projektu z opisem, skladem zespolu i tablica ogloszen,
- proces skladania zgloszenia do projektu z opisem mocnych stron i preferowanej roli,
- panel wlasciciela do akceptacji lub odrzucania kandydatow, edycji projektu i usuwania czlonkow.

## Szybki start przez Docker

```bash
docker compose up --build
```

Jesli uruchamiasz projekt na maszynie, na ktorej ten stos byl juz odpalany wczesniej i MySQL ma stary wolumen danych, najpierw wyczysc go:

```bash
docker compose down -v
docker compose up --build
```

Po uruchomieniu:

- frontend: [http://localhost:3000](http://localhost:3000)
- backend API: [http://localhost:8000](http://localhost:8000)
- dokumentacja API: [http://localhost:8000/docs](http://localhost:8000/docs)

Blad `Host '...' is not allowed to connect to this MySQL server` zwykle oznacza, ze w istniejacym wolumenie MySQL zostaly stare uprawnienia uzytkownika. Skrypt z katalogu `db-init/` ustawia konto `appuser` dla polaczen z innych kontenerow, ale uruchamia sie tylko przy inicjalizacji pustej bazy.

## Struktura

- `backend/` - FastAPI, SQLAlchemy, JWT auth, logika projektow i zgloszen
- `frontend/` - React + React Router + Vite
- `docker-compose.yml` - wspolne uruchamianie frontendu, backendu i MySQL

## Rozwoj lokalny bez Dockera

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend deweloperski korzysta z proxy Vite do `http://localhost:8000`.
