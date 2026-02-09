# 📂 STRUKTURA PROJEKTU - Co je kde

```
zeny-zenam-app/
│
├── 📖 README.md                 ← Hlavní návod (ČTEŠ PRVNÍ!)
├── ⚡ QUICK_START.md            ← Rychlý návod na nasazení (15 min)
├── 🏠 LOCAL_TEST.md             ← Jak spustit lokálně na PC
│
├── backend/                     ← BACKEND (server)
│   ├── server.js                ← ⭐ Hlavní kód backendu (API)
│   ├── schema.sql               ← 🗄️ Databázové tabulky (SQL příkazy)
│   ├── package.json             ← 📦 Seznam Node.js balíčků
│   ├── .env.example             ← 🔒 Šablona pro tajné klíče
│   └── .gitignore               ← Git konfig
│
└── frontend/                    ← FRONTEND (webová stránka)
    └── index.html               ← ⭐ Kompletní web aplikace (HTML+CSS+JS)
```

---

## 🎯 CO KAŽDÝ SOUBOR DĚLÁ:

### Backend soubory:

**server.js** 
- Hlavní backend kód
- API endpointy (/login, /register, /search atd.)
- Připojení k databázi
- Autentizace

**schema.sql**
- SQL příkazy pro vytvoření databázových tabulek
- Tabulky: users, services, messages atd.
- Výchozí data (seznam služeb)

**package.json**
- Seznam knihoven které backend potřebuje
- Express, PostgreSQL, bcrypt, JWT atd.

**.env.example**
- Šablona pro tajné klíče
- DATABASE_URL, JWT_SECRET

---

### Frontend soubory:

**index.html**
- CELÁ webová aplikace v jednom souboru!
- HTML struktura
- CSS styly
- JavaScript kód pro komunikaci s backendem

---

## 🚀 JAK TO SPUSTIT:

### MOŽNOST A: Lokálně na PC (test)
```bash
1. Nainstaluj Node.js
2. cd backend
3. npm install
4. npm start
5. Otevři frontend/index.html v prohlížeči
```

### MOŽNOST B: Na internetu (Render)
```bash
1. Nahraj na GitHub
2. Vytvoř PostgreSQL databázi na Renderu
3. Nasaď backend na Render
4. Nasaď frontend na Render
5. Hotovo - máš živou aplikaci!
```

Podrobný postup viz **QUICK_START.md** nebo **README.md**

---

## 📥 CO SI STÁHNOUT:

**CELOU složku** `zeny-zenam-app` s VŠEMI podsložkami!

Pak budeš mít:
```
✅ backend/server.js
✅ backend/schema.sql  
✅ backend/package.json
✅ frontend/index.html
✅ README.md
✅ QUICK_START.md
```

---

## ❓ ČASTÉ OTÁZKY:

**Q: Můžu to spustit jen tak?**
A: Ne, musíš nainstalovat Node.js a spustit backend příkazy (viz LOCAL_TEST.md)

**Q: Kde je databáze?**
A: Buď lokálně PostgreSQL, nebo vytvoříš na Renderu

**Q: Musím umět programovat?**
A: Ne! Jen následuj návody krok za krokem

**Q: Je to zdarma?**
A: Ano! Render má free tier pro malé projekty

**Q: Můžu to sdílet s kamarádkami?**
A: Ano! Až to nahraješ na Render, dostaneš URL kterou sdílíš

---

**ZAČNI tady: QUICK_START.md nebo LOCAL_TEST.md** 🚀
