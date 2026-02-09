# ⚡ RYCHLÝ START - 15 minut do ostrého provozu!

## ✅ Co budeš potřebovat:
- GitHub účet (github.com)
- Render účet (render.com) - zdarma!

---

## 🚀 KROK 1: GitHub (5 min)

1. Jdi na https://github.com/new
2. Název: `zeny-zenam-app`
3. Private
4. Create repository
5. **Nahraj soubory** (použij "uploading an existing file" nebo git příkazy z README)

---

## 🗄️ KROK 2: Databáze (5 min)

1. Jdi na https://render.com → New + → PostgreSQL
2. Name: `zeny-zenam-db`
3. Database: `zeny_zenam`  
4. Region: Frankfurt
5. Free Plan → Create Database
6. **POČKEJ 2-3 minuty**
7. Zkopíruj **Internal Database URL**
8. Connect → PSQL Command → Otevři terminál
9. Zkopíruj celý obsah `backend/schema.sql` a vlož do terminálu

---

## 🖥️ KROK 3: Backend (3 min)

1. Render → New + → Web Service
2. Připoj GitHub repo `zeny-zenam-app`
3. Name: `zeny-zenam-backend`
4. Root Directory: `backend`
5. Build: `npm install`
6. Start: `npm start`
7. **Environment Variables:**
   ```
   DATABASE_URL = [tvoje Internal Database URL]
   JWT_SECRET = tajny-klic-12345
   NODE_ENV = production
   ```
8. Create Web Service
9. **ZKOPÍRUJ URL**: např. `https://zeny-zenam-backend.onrender.com`

---

## 🎨 KROK 4: Frontend (2 min)

1. **NEJDŘÍV** uprav `frontend/index.html`:
   - Řádek 364: změň `const API_URL = 'http://localhost:3000/api';`
   - Na: `const API_URL = 'https://TVOJE-BACKEND-URL.onrender.com/api';`
   - Commitni změnu na GitHub

2. Render → New + → Static Site
3. Stejný GitHub repo
4. Root Directory: `frontend`
5. Publish Directory: `.`
6. Create Static Site

---

## 🎉 HOTOVO!

Frontend URL je tvoje **živá aplikace**!  
Sdílej ji s kamarádkami: `https://zeny-zenam-frontend.onrender.com`

---

## 🧪 Test:

1. Otevři frontend URL
2. Zaregistruj se (jméno, email, heslo, město)
3. Vyber služby
4. Hotovo!

---

## ⚠️ DŮLEŽITÉ:

- První načtení může trvat **30-60 sekund** (free tier Renderu)
- Pak to běží normálně
- Data jsou permanentní - nezaniknou

---

## 🆘 Nefunguje?

**Backend error 500:**
- Zkontroluj DATABASE_URL v Environment Variables

**Frontend se nepřipojí:**
- Zkontroluj že jsi změnila API_URL v index.html
- Backend musí běžet (zelená tečka)

**Databáze je prázdná:**
- Spusť znovu schema.sql příkazy

---

**Máš to! 🚀 Aplikace je ŽIVÁ!**
