const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Resend email client
const resend = new Resend(process.env.RESEND_API_KEY);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Checking database tables...');
    
    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Tables not found. Creating tables...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          bio TEXT,
          avatar VARCHAR(50) DEFAULT 'avatar1',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create services table
      await pool.query(`
        CREATE TABLE services (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create user_services_offered table
      await pool.query(`
        CREATE TABLE user_services_offered (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
          UNIQUE(user_id, service_id)
        );
      `);
      
      // Create user_services_needed table
      await pool.query(`
        CREATE TABLE user_services_needed (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
          UNIQUE(user_id, service_id)
        );
      `);
      
      // Create messages table
      await pool.query(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create password reset table
      await pool.query(`
        CREATE TABLE password_resets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          reset_code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Insert default services
      await pool.query(`
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
      `);
      
      // Create indexes
      await pool.query(`
        CREATE INDEX idx_users_city ON users(city);
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_messages_from ON messages(from_user_id);
        CREATE INDEX idx_messages_to ON messages(to_user_id);
      `);
      
      console.log('✅ Database tables created successfully!');
    } else {
      console.log('✅ Database tables already exist.');
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Add new service (admin)
app.post('/api/services', async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO services (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Service already exists' });
    }
    console.error('Error adding service:', error);
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// Delete service (admin)
app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Register new user
app.post('/api/register', async (req, res) => {
  const { name, email, password, city, bio, avatar, servicesOffered, servicesNeeded } = req.body;

  if (!name || !email || !password || !city) {
    return res.status(400).json({ error: 'Name, email, password, and city are required' });
  }

  try {
    // Check if user already exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, city, bio, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, city, bio, avatar, created_at',
      [name, email, passwordHash, city, bio || null, avatar || 'avatar1']
    );

    const user = userResult.rows[0];

    // Add offered services
    if (servicesOffered && servicesOffered.length > 0) {
      for (const serviceId of servicesOffered) {
        await pool.query(
          'INSERT INTO user_services_offered (user_id, service_id) VALUES ($1, $2)',
          [user.id, serviceId]
        );
      }
    }

    // Add needed services
    if (servicesNeeded && servicesNeeded.length > 0) {
      for (const serviceId of servicesNeeded) {
        await pool.query(
          'INSERT INTO user_services_needed (user_id, service_id) VALUES ($1, $2)',
          [user.id, serviceId]
        );
      }
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Send welcome email
    try {
      await resend.emails.send({
        from: 'Ženy Ženám <onboarding@resend.dev>',
        to: email,
        subject: '🎉 Vítej v komunitě Ženy Ženám!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f5576c;">💜 Vítej, ${name}!</h1>
            <p>Jsme rádi, že ses připojila ke komunitě Ženy Ženám!</p>
            <p><strong>Tvůj profil:</strong></p>
            <ul>
              <li>📍 Město: ${city}</li>
              <li>✅ Nabízíš: ${servicesOffered ? servicesOffered.length : 0} služeb</li>
              <li>🔍 Hledáš: ${servicesNeeded ? servicesNeeded.length : 0} služeb</li>
            </ul>
            <p><strong>Co dělat dál?</strong></p>
            <ol>
              <li>Přihlas se do aplikace</li>
              <li>Hledej ženy ve tvém městě</li>
              <li>Kontaktuj je a domluvte se!</li>
            </ol>
            <p style="color: #856404; background: #fff3cd; padding: 15px; border-radius: 5px;">
              ⚠️ <strong>Bezpečnostní pokyny:</strong><br>
              • Setkávejte se vždy na veřejných místech<br>
              • Informujte blízkou osobu o setkání<br>
              • Důvěřujte svému instinktu
            </p>
            <p>Hodně štěstí!<br>Tým Ženy Ženám</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, city, bio, avatar FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's services
    const offeredResult = await pool.query(
      'SELECT s.id, s.name FROM services s JOIN user_services_offered uso ON s.id = uso.service_id WHERE uso.user_id = $1',
      [user.id]
    );

    const neededResult = await pool.query(
      'SELECT s.id, s.name FROM services s JOIN user_services_needed usn ON s.id = usn.service_id WHERE usn.user_id = $1',
      [user.id]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;

    res.json({
      user: {
        ...user,
        servicesOffered: offeredResult.rows,
        servicesNeeded: neededResult.rows
      },
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Request password reset
app.post('/api/password-reset/request', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    const userResult = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await pool.query(
      'INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetCode, expiresAt]
    );
    
    // Send reset code via email
    try {
      await resend.emails.send({
        from: 'Ženy Ženám <onboarding@resend.dev>',
        to: email,
        subject: '🔐 Reset hesla - Ženy Ženám',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f5576c;">🔐 Reset hesla</h1>
            <p>Ahoj ${user.name},</p>
            <p>Požádala jsi o reset hesla. Tvůj reset kód je:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${resetCode}
            </div>
            <p>Tento kód je platný <strong>15 minut</strong>.</p>
            <p>Pokud jsi o reset hesla nežádala, ignoruj tento email.</p>
            <p>Tým Ženy Ženám</p>
          </div>
        `
      });
      
      res.json({ 
        message: 'Reset kód byl odeslán na tvůj email',
        email: email
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Fallback: return code directly if email fails
      res.json({ 
        message: 'Reset code generated',
        resetCode: resetCode,
        email: email
      });
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// Reset password with code
app.post('/api/password-reset/confirm', async (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  
  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ error: 'Email, reset code, and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE user_id = $1 AND reset_code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, resetCode]
    );
    
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [resetResult.rows[0].id]);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, city, bio, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get user's services
    const offeredResult = await pool.query(
      'SELECT s.id, s.name FROM services s JOIN user_services_offered uso ON s.id = uso.service_id WHERE uso.user_id = $1',
      [user.id]
    );

    const neededResult = await pool.query(
      'SELECT s.id, s.name FROM services s JOIN user_services_needed usn ON s.id = usn.service_id WHERE usn.user_id = $1',
      [user.id]
    );

    res.json({
      ...user,
      servicesOffered: offeredResult.rows,
      servicesNeeded: neededResult.rows
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user services
app.put('/api/profile/services', authenticateToken, async (req, res) => {
  const { servicesOffered, servicesNeeded } = req.body;

  try {
    // Delete existing services
    await pool.query('DELETE FROM user_services_offered WHERE user_id = $1', [req.user.id]);
    await pool.query('DELETE FROM user_services_needed WHERE user_id = $1', [req.user.id]);

    // Add new offered services
    if (servicesOffered && servicesOffered.length > 0) {
      for (const serviceId of servicesOffered) {
        await pool.query(
          'INSERT INTO user_services_offered (user_id, service_id) VALUES ($1, $2)',
          [req.user.id, serviceId]
        );
      }
    }

    // Add new needed services
    if (servicesNeeded && servicesNeeded.length > 0) {
      for (const serviceId of servicesNeeded) {
        await pool.query(
          'INSERT INTO user_services_needed (user_id, service_id) VALUES ($1, $2)',
          [req.user.id, serviceId]
        );
      }
    }

    res.json({ message: 'Services updated successfully' });
  } catch (error) {
    console.error('Error updating services:', error);
    res.status(500).json({ error: 'Failed to update services' });
  }
});

// Delete user profile
app.delete('/api/profile', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// Update user city
app.put('/api/profile/city', authenticateToken, async (req, res) => {
  const { city } = req.body;
  
  if (!city) {
    return res.status(400).json({ error: 'City is required' });
  }
  
  try {
    await pool.query('UPDATE users SET city = $1 WHERE id = $2', [city, req.user.id]);
    res.json({ message: 'City updated successfully' });
  } catch (error) {
    console.error('Error updating city:', error);
    res.status(500).json({ error: 'Failed to update city' });
  }
});

// Update user avatar
app.put('/api/profile/avatar', authenticateToken, async (req, res) => {
  const { avatar } = req.body;
  
  if (!avatar) {
    return res.status(400).json({ error: 'Avatar is required' });
  }
  
  try {
    await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.user.id]);
    res.json({ message: 'Avatar updated successfully' });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Search for users in same city with matching services
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const currentUser = await pool.query(
      'SELECT city FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userCity = currentUser.rows[0].city;

    // Get services the current user needs
    const neededServices = await pool.query(
      'SELECT service_id FROM user_services_needed WHERE user_id = $1',
      [req.user.id]
    );

    const neededServiceIds = neededServices.rows.map(row => row.service_id);

    if (neededServiceIds.length === 0) {
      return res.json([]);
    }

    // Find users in same city who offer services that current user needs
    const matches = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.city, u.bio, u.avatar
       FROM users u
       JOIN user_services_offered uso ON u.id = uso.user_id
       WHERE u.city = $1 
       AND u.id != $2
       AND uso.service_id = ANY($3)`,
      [userCity, req.user.id, neededServiceIds]
    );

    // Get services for each matched user
    const usersWithServices = await Promise.all(
      matches.rows.map(async (user) => {
        const offeredResult = await pool.query(
          `SELECT s.id, s.name FROM services s 
           JOIN user_services_offered uso ON s.id = uso.service_id 
           WHERE uso.user_id = $1 AND s.id = ANY($2)`,
          [user.id, neededServiceIds]
        );

        return {
          ...user,
          servicesOffered: offeredResult.rows
        };
      })
    );

    res.json(usersWithServices);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Send message
app.post('/api/messages', authenticateToken, async (req, res) => {
  const { toUserId, message } = req.body;

  if (!toUserId || !message) {
    return res.status(400).json({ error: 'Recipient and message are required' });
  }

  try {
    // Get sender and recipient info
    const senderResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const recipientResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [toUserId]
    );
    
    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    const sender = senderResult.rows[0];
    const recipient = recipientResult.rows[0];
    
    const result = await pool.query(
      'INSERT INTO messages (from_user_id, to_user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, toUserId, message]
    );

    // Send email notification to recipient
    try {
      await resend.emails.send({
        from: 'Ženy Ženám <onboarding@resend.dev>',
        to: recipient.email,
        subject: `💬 ${sender.name} ti poslala zprávu!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f5576c;">💬 Nová zpráva!</h1>
            <p>Ahoj ${recipient.name},</p>
            <p><strong>${sender.name}</strong> ti poslala zprávu:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              "${message}"
            </div>
            <p><strong>Odpověz jí:</strong></p>
            <ul>
              <li>📧 Email: ${sender.email}</li>
              <li>💬 Nebo se přihlas do aplikace a odpověz tam</li>
            </ul>
            <p style="color: #856404; background: #fff3cd; padding: 15px; border-radius: 5px;">
              ⚠️ <strong>Bezpečnostní pokyny:</strong><br>
              • Setkávejte se vždy na veřejných místech<br>
              • Informujte blízkou osobu o setkání<br>
              • Důvěřujte svému instinktu
            </p>
            <p>Tým Ženy Ženám</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send message notification email:', emailError);
      // Don't fail message sending if email fails
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get user's messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, 
              u_from.name as from_name,
              u_from.email as from_email,
              u_from.avatar as from_avatar,
              u_to.name as to_name,
              u_to.email as to_email,
              u_to.avatar as to_avatar
       FROM messages m
       JOIN users u_from ON m.from_user_id = u_from.id
       JOIN users u_to ON m.to_user_id = u_to.id
       WHERE m.from_user_id = $1 OR m.to_user_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
