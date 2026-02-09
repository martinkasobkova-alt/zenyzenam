# 🏠 LOKÁLNÍ SPUŠTĚNÍ - Test na tvém počítači

Před nasazením na Render si můžeš aplikaci otestovat lokálně!

## ✅ Co potřebuješ nainstalovat:

1. **Node.js** - https://nodejs.org (stáhni LTS verzi)
2. **PostgreSQL** - https://www.postgresql.org/download/ 
   NEBO použij SQLite verzi (viz níže)

---

## 🚀 JEDNODUCHÉ SPUŠTĚNÍ (bez PostgreSQL)

Vytvořil jsem ti zjednodušenou verzi která používá **soubor místo databáze**.

### Krok 1: Otevři terminál/příkazový řádek

```bash
# Přejdi do složky backend
cd backend

# Nainstaluj balíčky
npm install
```

### Krok 2: Spusť backend

```bash
npm start
```

Uvidíš: `Server running on port 3000`

### Krok 3: Otevři frontend

Otevři soubor `frontend/index.html` v prohlížeči (dvojklik)

**HOTOVO!** Aplikace běží lokálně! 🎉

---

## 🧪 Co můžeš testovat:

✅ Registrace  
✅ Přihlášení  
✅ Editace profilu  
✅ Vyhledávání  
✅ Zprávy  

---

## 📝 S PostgreSQL (pokročilé)

Pokud chceš test s opravdovou databází:

1. Nainstaluj PostgreSQL
2. Vytvoř databázi:
   ```sql
   CREATE DATABASE zeny_zenam;
   ```
3. Spusť schema.sql:
   ```bash
   psql -U postgres -d zeny_zenam -f backend/schema.sql
   ```
4. Vytvoř `.env` soubor v `backend/`:
   ```
   DATABASE_URL=postgresql://postgres:heslo@localhost:5432/zeny_zenam
   JWT_SECRET=test-secret-123
   NODE_ENV=development
   ```
5. Spusť backend: `npm start`

---

## ⚠️ DŮLEŽITÉ:

Frontend má URL backendu nastavenou na:
```javascript
const API_URL = 'http://localhost:3000/api';
```

To je správně pro **lokální test**!

Až budeš nahrávat na Render, změníš to na:
```javascript
const API_URL = 'https://tvoje-backend.onrender.com/api';
```

---

## 🆘 Problémy?

**"npm: command not found"**
→ Nainstaluj Node.js: https://nodejs.org

**Backend nenaběhne**
→ Zkontroluj že běží na portu 3000 (žádná jiná aplikace)

**Frontend se nepřipojí**
→ Backend musí běžet PRVNÍ!

---

**Po otestování pokračuj nasazením na Render (viz README.md)!**
