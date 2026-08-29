import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { track, untrack } from '../realtime.js';

const router = Router();

router.get('/', (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = req.query.token || bearerToken;

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token requerido' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n');

  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);

  track(user.id, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      clearInterval(heartbeat);
      res.destroy();
      untrack(user.id, res);
    }
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    untrack(user.id, res);
  };

  res.on('close', cleanup);
  req.on('close', cleanup);
});

export default router;