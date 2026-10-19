import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
} catch (err) {
  console.error('[Server Startup Aborted]: Failed to connect to MongoDB on startup.');
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`[Cyber Simulator Backend] Server running on http://localhost:${PORT}`);
});

export default server;
