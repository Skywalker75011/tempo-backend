# 🏗️ TEMPO Backend - API REST

Backend Node.js/Express avec MongoDB pour l'application TEMPO de gestion BTP.

## 🚀 Démarrage Rapide

### Installation locale

```bash
cd tempo-backend
npm install
cp .env.example .env
# Éditer .env avec vos valeurs
npm start
```

Le serveur démarre sur http://localhost:5000

## 📦 Technologies

- **Node.js** + **Express** - Serveur API
- **MongoDB** + **Mongoose** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Chiffrement mots de passe
- **Multer** + **Cloudinary** - Upload fichiers (optionnel)

## 🔑 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/init` - Créer admin (admin@tempo.fr / admin123)

### Projects
- `GET /api/projects` - Liste projets
- `POST /api/projects` - Créer projet
- `GET /api/projects/:id` - Détails projet
- `PATCH /api/projects/:id` - Modifier projet
- `DELETE /api/projects/:id` - Supprimer projet

### Photos
- `GET /api/photos/project/:projectId` - Liste photos
- `POST /api/photos` - Ajouter photo
- `DELETE /api/photos/:id` - Supprimer photo

### Documents
- `GET /api/documents/project/:projectId` - Liste documents
- `POST /api/documents` - Ajouter document
- `PATCH /api/documents/:id/validate` - Valider document
- `PATCH /api/documents/:id/sign` - Signer document
- `PATCH /api/documents/:id/view` - Marquer comme consulté

### Pins (Annotations/Réserves)
- `GET /api/pins/project/:projectId` - Liste pins
- `POST /api/pins` - Créer pin
- `PATCH /api/pins/:id/toggle` - Changer statut réserve

### Employees & Time
- `GET /api/employees/project/:projectId` - Liste employés
- `POST /api/employees` - Ajouter employé
- `GET /api/employees/project/:projectId/time` - Liste pointages
- `POST /api/employees/time` - Ajouter pointage

### Tasks
- `GET /api/tasks/project/:projectId` - Liste tâches
- `POST /api/tasks` - Créer tâche
- `PATCH /api/tasks/:id` - Modifier tâche

### Finances
- `GET /api/finances/project/:projectId` - Liste finances
- `POST /api/finances` - Ajouter dépense/revenu

### Timeline
- `GET /api/timeline/project/:projectId` - Liste posts
- `POST /api/timeline` - Créer post

## 🌐 Déploiement

### MongoDB Atlas (Base de données gratuite)

1. Allez sur **https://cloud.mongodb.com**
2. Créez un compte gratuit
3. "Create Cluster" → "Shared" (gratuit)
4. Attendez 3 minutes
5. "Database Access" → "Add New Database User"
   - Username: `tempo`
   - Password: généré automatiquement (COPIEZ-LE)
6. "Network Access" → "Add IP Address" → "Allow Access from Anywhere"
7. "Connect" → "Connect your application"
   - Copiez la connection string
   - Remplacez `<password>` par votre mot de passe

### Railway (Backend gratuit)

1. Allez sur **https://railway.app**
2. "Start a New Project" → "Deploy from GitHub repo"
3. Connectez votre compte GitHub
4. Sélectionnez le repo tempo-backend
5. Variables d'environnement :
   - `MONGODB_URI` = votre connection string MongoDB
   - `JWT_SECRET` = générez une clé aléatoire
   - `PORT` = 5000
6. Deploy !

Vous obtenez : `https://tempo-backend.up.railway.app`

### Alternative: Render

1. Allez sur **https://render.com**
2. "New +" → "Web Service"
3. Connectez GitHub
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Variables d'environnement (même que Railway)
7. Deploy !

## 🔧 Initialisation

Une fois déployé, faites un POST sur `/api/auth/init` pour créer l'admin :

```bash
curl -X POST https://votre-backend.railway.app/api/auth/init
```

Créé : admin@tempo.fr / admin123

## 📝 Format des requêtes

Toutes les requêtes (sauf auth) nécessitent le header :

```
Authorization: Bearer <token>
```

Exemple avec fetch :

```javascript
fetch('https://api.../api/projects', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
})
```

## 🔐 Sécurité

- Mots de passe chiffrés avec bcrypt
- Tokens JWT avec expiration 30 jours
- Validation des données entrantes
- Protection CORS activée
- Variables sensibles dans .env

## 📞 Support

Le backend est prêt pour production. Toutes les fonctionnalités TEMPO sont implémentées.
