const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const sanitizeHtml = require('sanitize-html');

const app = express();
const port = process.env.PORT || 3001;
const saltRounds = 10;
const isProduction = process.env.NODE_ENV === 'production';

// Stop early with a clear message if something important is missing.
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to backend/.env or to your host settings.');
  process.exit(1);
}
if (isProduction && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is missing. Set it in your host settings.');
  process.exit(1);
}

// Render sits behind a proxy. This is needed for secure cookies to work.
app.set('trust proxy', 1);

// FRONTEND_URL can hold one URL or several separated by commas.
// Trailing slashes are removed because the browser never sends them.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''));

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

// Sessions are stored in MongoDB so users stay logged in even when
// the Render free server goes to sleep and restarts.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: 'login-system',
    collectionName: 'sessions',
  }),
  cookie: { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
}));

let usersCollection;

// Removes HTML tags from text. Passwords are never passed through this.
function cleanText(value) {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Handy for uptime pingers that keep the free Render server awake.
app.get('/health', (req, res) => {
  res.send({ ok: true });
});

app.get('/profile', (req, res) => {
  if (!req.session.email) {
    return res.status(200).send({ message: 'Not logged in' });
  }
  return res.send({ email: req.session.email, name: req.session.name });
});

app.post('/login', async (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).send({ success: false, message: 'Please enter your email and password.' });
  }

  try {
    const user = await usersCollection.findOne({ email: email });
    const match = user ? await bcrypt.compare(password, user.password) : false;

    // One message for both cases so nobody can find out which emails exist.
    if (!match) {
      return res.status(401).send({ success: false, message: 'Incorrect email or password.' });
    }

    req.session.name = user.name;
    req.session.email = user.email;

    const { password: _pw, ...safeUser } = user;
    return res.send({ success: true, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).send({ success: false, message: 'Error during the login process.' });
  }
});

app.post('/register', async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (!name || !email || !password) {
    return res.status(400).send({ success: false, message: 'Please fill in all fields.' });
  }
  if (name.length > 50) {
    return res.status(400).send({ success: false, message: 'Name must be 50 characters or less.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).send({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).send({ success: false, message: 'Password must be at least 8 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).send({ success: false, message: 'Passwords do not match.' });
  }

  try {
    const userExists = await usersCollection.findOne({ email: email });
    if (userExists) {
      return res.status(400).send({ success: false, message: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = { name: name, email: email, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    req.session.name = name;
    req.session.email = email;

    const { password: _pw, ...safeUser } = newUser;
    return res.status(201).send({ success: true, message: 'Registration successful!', user: safeUser });
  } catch (error) {
    // 11000 means the unique email index caught a duplicate.
    if (error.code === 11000) {
      return res.status(400).send({ success: false, message: 'Email already exists.' });
    }
    console.error('Registration error:', error);
    return res.status(500).send({ success: false, message: 'Error during the registration.' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Logout error:', error);
      return res.status(500).send({ success: false, message: 'Error during logout.' });
    }
    res.clearCookie('connect.sid', cookieOptions);
    return res.send({ success: true, message: 'Logged out.' });
  });
});

// Connect to the database first, then start accepting requests.
async function start() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('Connected to MongoDB Atlas');

  usersCollection = client.db('login-system').collection('users');

  try {
    await usersCollection.createIndex({ email: 1 }, { unique: true });
  } catch (error) {
    console.warn('Could not create the unique email index (duplicate emails already exist?):', error.message);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
