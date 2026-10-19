import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Cyber Simulator Backend] Server running on http://localhost:${PORT}`);
});

export default server;
