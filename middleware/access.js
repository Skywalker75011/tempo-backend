// ─── middleware/access.js ────────────────────────────────────────────────────
// Contrôle d'accès central et harmonisé. Remplace les contrôles incohérents
// (avant : seul pins.js vérifiait, et projects.js faisait `role==='admin' ? {}`).
//
// Principes (cf. KAIROS_DESIGN_v2.md) :
//  - deny-by-default
//  - superadmin (plateforme) n'a AUCUN accès aux données métier
//  - owner/admin internes : accès total aux chantiers de LEUR organisation
//  - staff interne / collaborator externe : accès par chantier + par onglet
//  - Pointage/Finances : internes uniquement, et seulement si validé (double vérif)
//  - Fallback rétro-compatible tant que la migration v2 n'est pas passée
const { Project, ProjectMember } = require('../models');

const SENSITIVE_TABS = ['pointage', 'finances'];
const ORG_ADMIN_ROLES = ['owner', 'admin'];

// Résout un access {ok, code} pour (user, projectId, tab).
async function evaluateAccess(user, projectId, tab) {
  if (!user) return { ok: false, code: 401 };
  if (!projectId) return { ok: false, code: 400 };

  // Le superadmin plateforme ne touche jamais aux données métier.
  if (user.role === 'superadmin') return { ok: false, code: 403 };

  const project = await Project.findById(projectId).select('createdBy organization members');
  if (!project) return { ok: false, code: 404 };

  const userId = user._id.toString();
  const isOrgAdmin = ORG_ADMIN_ROLES.includes(user.role);
  const isInternal = user.userType !== 'external';

  // ── Fallback rétro-compatible : données pas encore migrées (pas d'organization) ──
  // On reproduit l'ancien comportement pour ne rien casser pendant le déploiement,
  // MAIS on bloque déjà les onglets sensibles pour les externes.
  if (!project.organization) {
    const isCreator = project.createdBy?.toString() === userId;
    const isLegacyMember = (project.members || []).some(m => m.toString() === userId);
    const legacyAllowed = user.role === 'admin' || isOrgAdmin || isCreator || isLegacyMember;
    if (!legacyAllowed) return { ok: false, code: 403 };
    if (SENSITIVE_TABS.includes(tab) && !isInternal) return { ok: false, code: 403 };
    return { ok: true, project };
  }

  // ── Modèle v2 ──
  const sameOrg = user.organization &&
                  project.organization.toString() === user.organization.toString();
  if (!sameOrg) return { ok: false, code: 403 }; // cloisonnement inter-organisations

  // owner/admin de l'orga : accès complet (y compris sensible)
  if (isOrgAdmin) return { ok: true, project };

  const member = await ProjectMember.findOne({ project: projectId, user: userId });
  if (!member) return { ok: false, code: 403 };

  if (SENSITIVE_TABS.includes(tab)) {
    if (member.source === 'external') return { ok: false, code: 403 }; // externe : jamais
    if (!member.sensitive || !member.sensitive[tab]) return { ok: false, code: 403 }; // double vérif requise
    return { ok: true, project, member };
  }

  // Onglets non sensibles : grant par onglet
  if (member.tabs && member.tabs[tab]) return { ok: true, project, member };
  return { ok: false, code: 403 };
}

// Récupère l'id de projet depuis la requête (params/body), ou via un resolver custom.
function resolveProjectId(req, opts = {}) {
  if (opts.projectIdFrom) return opts.projectIdFrom(req);
  return req.params.projectId || req.body.project || req.body.projectId || req.params.id || null;
}

// Middleware factory : exige l'accès à `tab` sur le projet de la requête.
// opts.projectIdFrom(req) permet de résoudre l'id quand il faut charger la ressource d'abord.
function requireProjectAccess(tab, opts = {}) {
  return async (req, res, next) => {
    try {
      const projectId = await resolveProjectId(req, opts);
      const result = await evaluateAccess(req.user, projectId, tab);
      if (!result.ok) {
        const msg = result.code === 404 ? 'Projet introuvable.'
                  : result.code === 401 ? 'Authentification requise.'
                  : 'Accès refusé.';
        return res.status(result.code || 403).json({ error: msg });
      }
      req.access = result; // {project, member?} dispo pour le handler
      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

// Middleware : exige l'accès `tab` sur le projet d'une RESSOURCE chargée par son id.
// loadProjectId(req) -> Promise<projectId|null>. Donne un vrai 404 si la ressource n'existe pas.
function requireResourceAccess(tab, loadProjectId) {
  return async (req, res, next) => {
    try {
      const projectId = await loadProjectId(req);
      if (!projectId) return res.status(404).json({ error: 'Ressource introuvable.' });
      const result = await evaluateAccess(req.user, projectId, tab);
      if (!result.ok) {
        const msg = result.code === 404 ? 'Projet introuvable.'
                  : result.code === 401 ? 'Authentification requise.'
                  : 'Accès refusé.';
        return res.status(result.code || 403).json({ error: msg });
      }
      req.access = result;
      next();
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
}

// Petit fabricant de resolver : charge `Model` par req.params[idParam] et renvoie son champ `project`.
function projectIdOfResource(Model, idParam = 'id') {
  return async (req) => {
    const doc = await Model.findById(req.params[idParam]).select('project');
    return doc ? doc.project : null;
  };
}

// Visibilité d'un PROJET (pas d'un onglet) : l'utilisateur est-il rattaché à ce chantier ?
// Sert à GET /projects/:id et au listing. Respecte le mur RGPD + le cloisonnement orga.
async function canAccessProject(user, projectId) {
  if (!user) return { ok: false, code: 401 };
  if (!projectId) return { ok: false, code: 400 };
  if (user.role === 'superadmin') return { ok: false, code: 403 };

  const project = await Project.findById(projectId).select('createdBy organization members');
  if (!project) return { ok: false, code: 404 };

  const userId = user._id.toString();
  const isOrgAdmin = ORG_ADMIN_ROLES.includes(user.role);

  // Fallback rétro-compatible (données pas encore migrées : pas d'organization).
  if (!project.organization) {
    const ok = user.role === 'admin' || isOrgAdmin
      || project.createdBy?.toString() === userId
      || (project.members || []).some(m => m.toString() === userId);
    return ok ? { ok: true, project } : { ok: false, code: 403 };
  }

  // v2 : cloisonnement orga.
  if (!user.organization || project.organization.toString() !== user.organization.toString()) {
    return { ok: false, code: 403 };
  }
  if (isOrgAdmin) return { ok: true, project };
  const member = await ProjectMember.findOne({ project: projectId, user: userId });
  return member ? { ok: true, project, member } : { ok: false, code: 403 };
}

// Middleware de visibilité projet (req.params[idParam]).
function requireProjectVisible(idParam = 'id') {
  return async (req, res, next) => {
    try {
      const result = await canAccessProject(req.user, req.params[idParam]);
      if (!result.ok) {
        const msg = result.code === 404 ? 'Projet introuvable.'
                  : result.code === 401 ? 'Authentification requise.'
                  : 'Accès refusé.';
        return res.status(result.code || 403).json({ error: msg });
      }
      req.access = result;
      next();
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
}

// Middleware : réservé à un owner/admin interne de l'organisation propriétaire du projet (req.params[idParam]).
// Pour les actions d'administration du chantier (modifier/supprimer le projet, gérer ses membres legacy).
function requireProjectOrgAdmin(idParam = 'id') {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'superadmin') return res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' });
      if (!ORG_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
      const result = await canAccessProject(req.user, req.params[idParam]);
      if (!result.ok) {
        const msg = result.code === 404 ? 'Projet introuvable.' : 'Accès refusé.';
        return res.status(result.code || 403).json({ error: msg });
      }
      req.access = result;
      next();
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
}

// Réservé à la plateforme (toi). N'accède JAMAIS aux données métier.
function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à la plateforme.' });
  }
  next();
}

module.exports = {
  evaluateAccess, requireProjectAccess, requireResourceAccess, projectIdOfResource,
  canAccessProject, requireProjectVisible, requireProjectOrgAdmin,
  requireSuperadmin, SENSITIVE_TABS, ORG_ADMIN_ROLES,
};
