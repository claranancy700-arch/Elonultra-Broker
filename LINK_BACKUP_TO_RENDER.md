# Link Local Backup to Render-Hosted PostgreSQL

## 🎯 Goal: Restore Local Backup to Render Database

You have:
1. ✅ Local backup: `Backend DB backup/elon_backup.sql`
2. ✅ Render-hosted PostgreSQL (already created)
3. ❌ Need to: Connect them together

---

## 🔄 Step-by-Step Process

### STEP 1: Get Your Render Database Connection Details

**In Render Dashboard:**

1. Go to [render.com](https://render.com) → Login
2. Find your PostgreSQL service (usually under Resources/Databases)
3. Click on it → Copy the connection info:

Look for:
- **Host**: `dpg-XXXXX.postgres.render.com`
- **Database**: `your_db_name`
- **User**: `your_user`
- **Password**: `your_password`
- **Port**: `5432`

Or find the full connection string:
```
postgresql://user:password@host:5432/dbname
```

**Example:**
```
postgresql://postgres:abc123xyz@dpg-d66qooo6fj8s739bks70-a.postgres.render.com:5432/elon_db
```

---

### STEP 2: Test Connection to Render Database

From PowerShell, test if you can reach it:

```powershell
# Replace with YOUR Render details
$host = "dpg-d66qooo6fj8s739bks70-a.postgres.render.com"
$user = "postgres"
$dbname = "elon_db"
$password = "your_password"

# Set password
$env:PGPASSWORD = $password

# Test connection
psql -h $host -U $user -d $dbname -c "SELECT version();"
```

If you see PostgreSQL version → **Connection works!** ✅

---

### STEP 3: Restore Backup to Render Database

Now restore your local backup to the Render database:

```powershell
# Set your Render database credentials
$host = "your-render-host.postgres.render.com"
$user = "postgres"
$dbname = "your_db_name"
$password = "your_password"

# Set password for psql
$env:PGPASSWORD = $password

# Restore the backup
psql -h $host -U $user -d $dbname -f "Backend DB backup/elon_backup.sql"
```

**Watch the output:**
- Should show many `CREATE TABLE`, `CREATE INDEX`, `INSERT` statements
- At the end, should complete without errors
- This takes 30 seconds to 2 minutes

---

## 🚀 Option 2: Using pgAdmin (If Installed Locally)

### Connect pgAdmin to Render Database

1. **Open pgAdmin 4** → `http://localhost:5050`

2. **Add new server:**
   - Right-click **Servers** → **Register** → **Server**
   - **Name**: `Render Production`
   - **Host**: Your Render host (from Step 1)
   - **Port**: `5432`
   - **Database**: Your database name
   - **Username**: Your username
   - **Password**: Your password
   - Click **Save**

3. **Verify Connection:**
   - Should appear in left panel
   - Right-click → **Properties** to verify

4. **Restore Backup:**
   - Right-click the new database → **Restore**
   - Select `Backend DB backup/elon_backup.sql`
   - Click **Restore**

---

## 📋 Step-by-Step for PowerShell (Recommended)

```powershell
# 1. Navigate to your project
cd "c:\tyle\Elon U"

# 2. Set Render database credentials (replace with YOUR values)
$host = "dpg-xxxxx.postgres.render.com"
$user = "postgres"
$password = "your_password"
$dbname = "your_database_name"

# 3. Set the password environment variable
$env:PGPASSWORD = $password

# 4. Test connection first
Write-Host "Testing connection to Render database..."
psql -h $host -U $user -d $dbname -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 5. If test works, restore the backup
Write-Host "Restoring backup to Render database..."
psql -h $host -U $user -d $dbname -f "Backend DB backup/elon_backup.sql"

# 6. Verify restoration
Write-Host "Verifying backup was restored..."
psql -h $host -U $user -d $dbname -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

# Should show 18 (or 8 if new tables not added yet)
```

---

## ✅ Verify It Worked

```powershell
$env:PGPASSWORD = "your_password"

# Check tables exist
psql -h your-render-host -U postgres -d your_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

# Check data exists
psql -h your-render-host -U postgres -d your_db -c "SELECT COUNT(*) as user_count FROM public.users;"

# Check trades
psql -h your-render-host -U postgres -d your_db -c "SELECT COUNT(*) as trade_count FROM public.trades;"
```

Should return:
- **table_count**: 8 (or 18 if you added new tables)
- **user_count**: ~5
- **trade_count**: ~49

---

## 🔗 Update Your `.env` 

Once verified, your `.env` should have:

```bash
# Use Render database
DATABASE_URL=postgresql://postgres:your_password@your-render-host:5432/your_database_name

# Local reference (optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elon_backend_db
DB_USER=postgres
DB_PASSWORD=peter12345
```

The `DATABASE_URL` is what your backend uses. Points to Render!

---

## 🚀 Start Backend with Render Database

```bash
npm run dev
```

Your backend should connect to Render PostgreSQL automatically!

---

## 🆘 Troubleshooting

### Error: "Connection refused"
- Render database might not be running
- Check Render dashboard
- Verify host/port are correct

### Error: "Password authentication failed"
- Wrong password for Render database
- Verify credentials match Render dashboard

### Error: "Database does not exist"
- Database name wrong
- Create database in Render first

### Error: "Permission denied"
- User doesn't have privileges
- Render usually creates with public schema access

### psql command not found
- Install PostgreSQL CLI tools
- Or use [pgAdmin GUI](#option-2-using-pgadmin-if-installed-locally)

---

## 🔄 Two-Way Sync (Optional)

If you want to sync between local and Render:

**Local → Render:**
```powershell
# Backup local, restore to Render
pg_dump -U postgres -d elon_backend_db > temp_backup.sql
psql -h render-host -U postgres -d render_db -f temp_backup.sql
```

**Render → Local:**
```powershell
# Backup Render, restore to local
pg_dump -h render-host -U postgres -d render_db > render_backup.sql
psql -U postgres -d elon_backend_db -f render_backup.sql
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Test connection | `psql -h HOST -U USER -d DB -c "SELECT 1;"` |
| Count tables | `psql -h HOST -U USER -d DB -c "SELECT COUNT(*) FROM information_schema.tables;"` |
| Restore backup | `psql -h HOST -U USER -d DB -f backup.sql` |
| List databases | `psql -h HOST -U USER -l` |

---

## ✨ You're Done!

Once the backup is restored to Render:
1. ✅ Render database has all your data
2. ✅ Local pgAdmin shows local copy
3. ✅ Backend connects to Render
4. ✅ Ready for production deployment!

**Next:** Push to GitHub and deploy! 🚀
