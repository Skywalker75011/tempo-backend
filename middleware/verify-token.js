const jwt = require('jsonwebtoken');

// Vérification RAPIDE du jeton (signature uniquement, AUCUN accès base de données).
// À placer AVANT le parser de corps sur les routes d'upload : une requête à corps
// (POST/PUT/PATCH) sans jeton valide est rejetée (401) AVANT que les 50 Mo ne soient
// bufferisés en mémoire → ferme le vecteur de DoS mémoire non authentifié.
// L'authentification complète (chargement de l'utilisateur, statut) reste faite par
// le middleware `auth` à l'intérieur de chaque route.
module.exports = function verifyTokenFast(req, res, next) {
  // Pas de corps => pas de risque de buffering ; on laisse la route gérer l'auth.
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const token = (req.header('Authorization') || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};
