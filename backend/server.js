const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
  const { name, email, password, city, bio, servicesOffered, servicesNeeded } = req.body;

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
      'INSERT INTO users (name, email, password_hash, city, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, city, bio, created_at',
      [name, email, passwordHash, city, bio || null]
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
      'SELECT id, name, email, password_hash, city, bio FROM users WHERE email = $1',
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

// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, city, bio, created_at FROM users WHERE id = $1',
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
      `SELECT DISTINCT u.id, u.name, u.email, u.city, u.bio
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
    const result = await pool.query(
      'INSERT INTO messages (from_user_id, to_user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, toUserId, message]
    );

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
              u_to.name as to_name
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
