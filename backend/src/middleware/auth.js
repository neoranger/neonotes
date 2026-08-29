import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción. Configúralo vía variable de entorno.');
  }
  console.warn('[SECURITY] JWT_SECRET no configurado. Usando secreto por defecto SOLO para desarrollo local.');
}

const DEFAULT_DEV_SECRET = 'neonotes_local_dev_secret_only';
const ACTIVE_SECRET = JWT_SECRET || DEFAULT_DEV_SECRET;

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token requerido' });
  }

  jwt.verify(token, ACTIVE_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    ACTIVE_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, ACTIVE_SECRET);
  } catch (err) {
    return null;
  }
}
