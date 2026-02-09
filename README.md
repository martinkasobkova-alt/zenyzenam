# Ženy Ženám - Aplikace pro výměnu služeb

Kompletní full-stack aplikace pro komunitu žen, které si chtějí vyměňovat služby a vzájemně se podporovat.

## 🚀 Technologie

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript (HTML/CSS/JS)
- **Hosting**: Render

## 📋 Funkce

✅ Registrace a přihlášení uživatelek  
✅ Nastavení nabízených a hledaných služeb  
✅ Vyhledávání žen ve stejném městě  
✅ Messaging mezi uživatelkami  
✅ Bezpečnostní instrukce  
✅ Editace profilu  
✅ Smazání účtu  

---

## 🛠️ Nasazení na Render - KROK ZA KROKEM

### KROK 1: Nahraj kód na GitHub

1. **Vytvoř nový repozitář na GitHubu:**
   - Jdi na https://github.com/new
   - Název: `zeny-zenam-app`
   - Visibility: Private (nebo Public)
   - Klikni "Create repository"

2. **Nahraj soubory:**
   ```bash
   # V terminálu na svém počítači (ve složce zeny-zenam-app):
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TVOJE-UZIVATELSKE-JMENO/zeny-zenam-app.git
   git push -u origin main
   ```

### KROK 2: Vytvoř PostgreSQL databázi na Renderu

1. **Přihlas se na Render:**
   - Jdi na https://render.com
   - Klikni "Get Started" a zaregistruj se (můžeš použít GitHub účet)

2. **Vytvoř novou databázi:**
   - Na Render dashboardu klikni "New +"
   - Vyber "PostgreSQL"
   - Vyplň:
     - **Name**: `zeny-zenam-db`
     - **Database**: `zeny_zenam`
     - **User**: `zeny_zenam_user`
     - **Region**: Frankfurt (Europe West)
     - **Plan**: Free
   - Klikni "Create Database"

3. **Počkej než se databáze vytvoří** (pár minut)

4. **Najdi connection string:**
   - V detailu databáze najdi "Internal Database URL"
   - Zkopíruj ho (bude vypadat nějak takto):
     ```
     postgresql://zeny_zenam_user:xxxxx@dpg-xxxxx.frankfurt-postgres.render.com/zeny_zenam
     ```

5. **Inicializuj databázi:**
   - V detailu databáze klikni na "Connect"
   - Vyber "External Connection"
   - Zkopíruj PSQL Command
   - Otevři ho v terminálu (nebo použij pgAdmin/TablePlus)
   - Vlož obsah souboru `backend/schema.sql`
   - Spusť ho (vytvoří tabulky a základní data)

### KROK 3: Nasaď Backend na Render

1. **Vytvoř nový Web Service:**
   - Na Render dashboardu klikni "New +"
   - Vyber "Web Service"
   - Připoj svůj GitHub repozitář `zeny-zenam-app`
   - Klikni "Connect"

2. **Nastav parametry:**
   - **Name**: `zeny-zenam-backend`
   - **Region**: Frankfurt (Europe West)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Přidej Environment Variables:**
   - Klikni "Advanced" → "Add Environment Variable"
   - Přidej tyto proměnné:
   
   ```
   DATABASE_URL = [zkopíruj Internal Database URL z databáze]
   JWT_SECRET = nahodny-tajny-retezec-123456
   NODE_ENV = production
   PORT = 3000
   ```

4. **Klikni "Create Web Service"**

5. **Počkej na deploy** (5-10 minut)

6. **Zkopíruj URL backendu:**
   - Nahoře uvidíš URL typu: `https://zeny-zenam-backend.onrender.com`
   - ZKOPÍRUJ SI JI!

### KROK 4: Nasaď Frontend na Render

1. **Uprav frontend/index.html:**
   - Otevři soubor `frontend/index.html`
   - Najdi řádek: `const API_URL = 'http://localhost:3000/api';`
   - Změň na: `const API_URL = 'https://zeny-zenam-backend.onrender.com/api';`
   - Ulož a commitni změnu do GitHubu:
     ```bash
     git add frontend/index.html
     git commit -m "Update API URL"
     git push
     ```

2. **Vytvoř nový Static Site:**
   - Na Render dashboardu klikni "New +"
   - Vyber "Static Site"
   - Připoj stejný GitHub repozitář
   - Klikni "Connect"

3. **Nastav parametry:**
   - **Name**: `zeny-zenam-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: (nechej prázdné)
   - **Publish Directory**: `.`

4. **Klikni "Create Static Site"**

5. **Tvoje aplikace je ŽIVÁ! 🎉**
   - Frontend URL: `https://zeny-zenam-frontend.onrender.com`

---

## 🧪 Testování

1. **Otevři frontend URL**
2. **Zaregistruj se:**
   - Zadej jméno, email, heslo, město
   - Vyber služby které nabízíš a hledáš
   - Klikni "Vytvořit profil"

3. **Otestuj funkce:**
   - Editace služeb v profilu
   - Vyhledávání (pokud jsou jiné uživatelky ve stejném městě)
   - Odeslání zprávy

4. **Sdílej s kamarádkami!**
   - Pošli jim frontend URL
   - Ať se zaregistrují ve stejném městě
   - Můžete si vyměňovat služby!

---

## 🐛 Řešení problémů

### Backend nefunguje
- Zkontroluj že DATABASE_URL je správně nastavená
- Podívej se do Logs na Renderu (záložka "Logs")

### Frontend se nemůže připojit k backendu
- Zkontroluj že jsi změnila `API_URL` ve frontend/index.html
- Ujisti se že backend běží (zelená tečka na Renderu)

### Databáze je prázdná
- Spusť znovu `schema.sql` v psql konzoli databáze

### CORS chyby
- Backend má CORS povolený, ale pokud by byly problémy, přidej do `backend/server.js`:
  ```javascript
  app.use(cors({
    origin: 'https://zeny-zenam-frontend.onrender.com'
  }));
  ```

---

## 📝 Další vylepšení (co můžeš přidat později)

- [ ] Email notifikace
- [ ] Nahrávání profilové fotky
- [ ] Hodnocení/recenze uživatelek
- [ ] Chat v real-time
- [ ] Mobilní aplikace (React Native)
- [ ] Admin panel pro správu

---

## 📧 Potřebuješ pomoc?

Pokud něco nefunguje, podívej se do:
- Render Logs (v dashboardu každého service)
- Browser Console (F12 → Console tab)

---

**Vytvořeno s 💜 pro komunitu žen**
