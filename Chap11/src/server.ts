
import 'dotenv/config';
import app from './app.js';
import { cleanupExpiredTokens } from './services/authService.js';

const PORT = Number(process.env.PORT ?? 3000);
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; 

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});


setInterval(() => {
  cleanupExpiredTokens()
    .then((count) => {
      if (count > 0) console.log(`Removed ${count} expired refresh tokens`);
    })
    .catch((error) => console.error('Token cleanup failed', error));
}, CLEANUP_INTERVAL_MS).unref();
