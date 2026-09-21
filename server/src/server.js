import app from './app.js';
import { config } from './config/index.js';
import { pool } from './db/index.js';

const PORT = config.port;

const startServer = async () => {
  try {
    // Verify DB connectivity on startup
    const res = await pool.query('SELECT NOW()');
    console.log(`[Database] PostgreSQL connected at ${res.rows[0].now}`);

    app.listen(PORT, () => {
      console.log(`[Server] BuyerShield backend running at http://localhost:${PORT}`);
      console.log(`[Environment] ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error('[Server Startup Error]', err);
    process.exit(1);
  }
};

startServer();
