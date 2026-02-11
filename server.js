const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const nunjucks = require('nunjucks');
require('dotenv').config();

const app = express();

// MongoDB connection
const mongoUser = encodeURIComponent(process.env.MONGO_INITDB_ROOT_USERNAME);
const mongoPass = encodeURIComponent(process.env.MONGO_INITDB_ROOT_PASSWORD);
const mongoUrl = `mongodb://${mongoUser}:${mongoPass}@mongo:27017/portfolio?authSource=admin`;

mongoose.connect(mongoUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app
});
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);
app.set('views', path.join(__dirname, 'views'));

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// Models
const BlogPost = mongoose.model('BlogPost', new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
}));

const Comment = mongoose.model('Comment', new mongoose.Schema({
  postId: mongoose.Schema.Types.ObjectId,
  text: String,
  createdAt: { type: Date, default: Date.now },
}));

// GitHub API Helper
const GITHUB_USERNAME = 'RikoxCode';
let githubCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function fetchGitHubRepos() {
  const now = Date.now();
  if (githubCache.data && (now - githubCache.timestamp) < CACHE_DURATION) {
    return githubCache.data;
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${GITHUB_USERNAME}/repos`, {
      params: {
        sort: 'updated',
        per_page: 100
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const repos = response.data
      .filter(repo => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 8)
      .map(repo => ({
        name: repo.name,
        description: repo.description || 'No description available',
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
        topics: repo.topics || []
      }));

    githubCache = { data: repos, timestamp: now };
    return repos;
  } catch (error) {
    console.error('GitHub API Error:', error.message);
    return [];
  }
}

// Routes
async function getHomeData(req, res) {
  const repos = await fetchGitHubRepos();
  res.render('index.njk', { 
    isAdmin: req.session.isAdmin,
    repos: repos 
  });
}

app.get('/', async (req, res) => {
  await getHomeData(req, res);
});

// Admin login page
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/blog');
  }
  res.render('login.njk', { error: req.query.error });
});

// Admin login handler
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/blog');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/blog');
});

// Blog list
app.get('/blog', async (req, res) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  res.render('blog.njk', { posts, isAdmin: req.session.isAdmin });
});

// Blog post detail
app.get('/blog/:id', async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  const comments = await Comment.find({ postId: post._id }).sort({ createdAt: -1 });
  res.render('blog_post.njk', { post, comments, isAdmin: req.session.isAdmin });
});

// Create blog post (admin only)
app.post('/blog', isAdmin, async (req, res) => {
  const { title, content } = req.body;
  await BlogPost.create({ title, content });
  res.redirect('/blog');
});

// Delete blog post (admin only)
app.post('/blog/:id/delete', isAdmin, async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);
  await Comment.deleteMany({ postId: req.params.id });
  res.redirect('/blog');
});

// Add anonymous comment
app.post('/blog/:id/comments', async (req, res) => {
  const { text } = req.body;
  await Comment.create({ postId: req.params.id, text });
  res.redirect(`/blog/${req.params.id}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
