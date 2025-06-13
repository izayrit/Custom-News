// affa581634e34f99ae9c747f9bb84ef5

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { fetch } = require('undici');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, 'user_data.json');
const NEWS_API_KEY = 'affa581634e34f99ae9c747f9bb84ef5';

function normalizeIp(ip) {
  if (ip === '::1') return '127.0.0.1';
  if (ip && ip.startsWith('::ffff:')) return ip.split('::ffff:')[1];
  return ip;
}

function extractTextFromURL(url) {
  try {
    const u = new URL(url);
    const query = u.searchParams.get('q');
    if (query) return query;
    if (u.hostname.includes('wikipedia.org')) {
      const parts = u.pathname.split('/');
      const title = parts[parts.length - 1].replace(/_/g, ' ');
      return decodeURIComponent(title);
    }
    return u.hostname.replace('www.', '').split('.')[0];
  } catch {
    return url;
  }
}

async function loadUserData() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveUserData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

async function updateUser(ip, url) {
  const data = await loadUserData();

  if (!data[ip]) {
    data[ip] = {
      urls: [],
      texts: []
    };
  }

  const extractedText = extractTextFromURL(url);
  data[ip].urls.push(url);
  data[ip].texts.push(extractedText);

  await saveUserData(data);
}

async function getNewsRecommendations(ip) {
  const data = await loadUserData();
  if (!data[ip]) return [];

  const keywords = data[ip].texts.slice(-10);
  const query = encodeURIComponent(keywords.join(' OR '));
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&pageSize=5&apiKey=${NEWS_API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  return json.articles?.map(article => ({
    title: article.title,
    url: article.url
  })) || [];
}

app.post('/track', async (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ip = normalizeIp(rawIp);
  const url = req.body.url;

  try {
    await updateUser(ip, url);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get('/recommend/:ip', async (req, res) => {
  const rawIp = req.params.ip;
  const ip = normalizeIp(rawIp);
  try {
    const recommendations = await getNewsRecommendations(ip);
    res.json(recommendations);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get('/my-ip', (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ip = normalizeIp(rawIp);
  res.json({ ip });
});

app.listen(3000, () => console.log('Server running on port 3000'));
