-- Database schema for Ženy Ženám aplikace

-- Tabulka uživatelek
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka služeb
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Služby které uživatelka nabízí
CREATE TABLE user_services_offered (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(user_id, service_id)
);

-- Služby které uživatelka hledá
CREATE TABLE user_services_needed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(user_id, service_id)
);

-- Zprávy mezi uživatelkami
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Výchozí služby
INSERT INTO services (name) VALUES
    ('Hlídání dětí'),
    ('Výuka jazyků'),
    ('Koučink'),
    ('Účetnictví'),
    ('Právní poradenství'),
    ('IT podpora'),
    ('Grafický design'),
    ('Psaní textů'),
    ('Překlady'),
    ('Fotografie'),
    ('Make-up'),
    ('Kadeřnictví'),
    ('Masáže'),
    ('Cvičení/fitness'),
    ('Vaření'),
    ('Úklid'),
    ('Žehlení'),
    ('Zahradničení'),
    ('Opravy oblečení'),
    ('Výměna oblečení'),
    ('Společnost na aktivity'),
    ('Doprovod k lékaři'),
    ('Pomoc se stěhováním'),
    ('Pomoc se zvířaty');

-- Indexy pro rychlejší vyhledávání
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_messages_from ON messages(from_user_id);
CREATE INDEX idx_messages_to ON messages(to_user_id);
