const express = require('express');

const app = express();
const PORT = 3002;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
