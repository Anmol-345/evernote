# Deployment Guide

This guide covers deployment of the Second Brain application components.

## Web Application (Next.js)

### Prerequisites
- Node.js 18+ installed
- Supabase project created with Auth enabled
- MCP server deployed and accessible

### Build
```bash
cd apps/web
npm install
npm run build
```

### Environment setup
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Deployment providers
- **Vercel**: Connect your GitHub repository and deploy. Vercel automatically detects the Next.js framework.
- **Netlify**: Set the build command to `npm run build` and the publish directory to `.next`.
- **AWS Amplify**: Connect repository and configure environment variables.

### Post-deployment
- Run database migrations against the production Supabase project
- Configure RLS policies (already included in migrations)
- Test authentication flow
- Verify MCP server connectivity

## Mobile Application (Flutter)

### Prerequisites
- Flutter SDK installed
- Android Studio for Android development
- Supabase project created with Auth enabled

### Configuration
Add environment variables to your Flutter project:
```bash
# In your Flutter project
flutter config --shell-platform android
```

Set up `google-services.json` for Android (Firebase configuration required for Auth).

### Build and run Android
```bash
cd apps/mobile
flutter pub get
flutter build apk --release
# Or for debugging
flutter run
```

### iOS (later target)
```bash
flutter build ios --release
```

## MCP Server

### Prerequisites
- Node.js 18+ installed
- Supabase project with service-role key
- HTTPS/TLS configured for production

### Deployment options

#### Render.com (recommended for small projects)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `node index.js`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MCP_PORT` (optional, default 3001)
6. Deploy

#### Railway
1. Create a new project on Railway
2. Deploy from GitHub
3. Add environment variables in the dashboard
4. Set the port if needed

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

### Health checks
- `GET /health` - returns `{ status: 'ok' }`
- `GET /` - MCP discovery endpoint listing available tools

## Supabase Project Setup

### Required extensions
- `pgcrypto` (included in migrations)

### Required tables
All tables are created by running the migrations in order:
1. `001_initial_schema.sql`

### Required RLS policies
The migrations include RLS policies for all user-owned tables. Ensure RLS is enabled on each table.

### Storage bucket
Create a private Storage bucket named `attachments` or configure according to your Supabase setup. The migration includes policies that restrict access to the authenticated owner.

### Realtime
Enable Realtime for the project if you want real-time updates, though the MVP uses polling/refetching rather than Realtime as the primary consistency mechanism.

## Migration Apply Order

Always apply migrations in order. Do not skip or reorder migrations, as each builds on the previous one.

```bash
# Using Supabase CLI
supabase db reset  # Only for fresh projects, never on existing data
# Or apply migrations manually via the SQL editor
```

## Rollback / Recovery

### Backup before major changes
Always take a backup of your Supabase database before applying new migrations to an existing project.

### Recovery steps
1. If a migration fails, restore from backup
2. Review the migration for errors and fix
3. Re-apply the migration
3. Run verification scripts in `database/verification/`

### Permanent deletion
The schema uses soft-delete (archived_at, deleted_at) for recoverability. Permanent deletion is a separate explicit operation and is not included in the MVP migrations.