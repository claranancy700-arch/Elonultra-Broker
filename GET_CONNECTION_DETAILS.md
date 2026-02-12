# How to Get Database Connection Details from pgAdmin 4

## 🔍 Step-by-Step Guide

### STEP 1: Open pgAdmin 4
- Go to pgAdmin in your browser (usually `http://localhost:5050`)
- Login with your pgAdmin credentials

### STEP 2: Find Your Database Connection Details

In the left panel:

1. **Expand Servers** → Click on your PostgreSQL server name
2. **Right-click the server** → Select **Properties**
3. Look at the **Connection** tab

You'll see:

```
Host name/address: localhost
Port: 5432
Maintenance database: postgres
Username: postgres
Password: [what you set during installation]
```

---

## 📋 Fill In Your Details

Copy and fill in these values:

| Setting | Value | Where to Find |
|---------|-------|---------------|
| **DB_HOST** | `localhost` | Server Properties → Connection → Host name |
| **DB_PORT** | `5432` | Server Properties → Connection → Port |
| **DB_NAME** | `Elon-backend-db` | The database name in left panel |
| **DB_USER** | `postgres` | Server Properties → Connection → Username |
| **DB_PASSWORD** | `???` | What you entered during PostgreSQL installation |
| **DATABASE_URL** | `postgresql://postgres:password@localhost:5432/Elon-backend-db` | Combine all above |

---

## 🔐 Finding Your PostgreSQL Password

### If You Just Installed It:
The password is what you created during PostgreSQL installation setup. If you don't remember:

**Option 1: Reset Password in pgAdmin**
1. In pgAdmin, right-click the **postgres** user (under the server)
2. Click **Properties**
3. Go to **Definition** tab
4. Change password and click **Save**

**Option 2: Check if stored in pgAdmin**
1. Right-click Server → **Properties** → **Security** tab
2. Check if password is saved there

---

## 🎯 Example Setup

If your setup is:
- Host: `localhost`
- Port: `5432`
- Database: `Elon-backend-db`
- User: `postgres`
- Password: `mypassword123`

Your `.env` file should be:

```bash
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/Elon-backend-db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Elon-backend-db
DB_USER=postgres
DB_PASSWORD=mypassword123
```

---

## 📍 Finding in pgAdmin - Visual Steps

### To Check Server Connection Details:

1. **Left Panel** → Find your server name (usually "PostgreSQL 18" or similar)
2. **Right-click** → **Properties**
3. **Connection Tab** shows all details

### To Check Database:

1. **Left Panel** → Expand your server → **Databases**
2. You should see **Elon-backend-db** listed
3. **Right-click it** → **Properties** for more details

---

## ✅ Test Connection

Once you have all values, test in PowerShell:

```powershell
# Replace with your actual values
$env:PGPASSWORD = "your_password"
psql -h localhost -U postgres -d Elon-backend-db -c "SELECT version();"
```

If it works, you'll see PostgreSQL version info.

---

## 🚨 Common Password Issues

### Password Contains Special Characters?
If password has `@`, `#`, `$`, etc., URL-encode it:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `:` → `%3A`

Example: password `pass@word123`
```
postgresql://postgres:pass%40word123@localhost:5432/Elon-backend-db
```

---

## 📌 Once You Have All Details

Create `.env` file in your project root:

```bash
# Database Connection
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/Elon-backend-db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Elon-backend-db
DB_USER=postgres
DB_PASSWORD=PASSWORD

# Optional
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=5000
```

Replace `PASSWORD` with your actual PostgreSQL password.

---

## 🔄 Now You Can:

```bash
# Your backend will connect to the database
npm run dev
```

Backend will use these connection details to:
- Connect to the database
- Authenticate as user "postgres"
- Access the "Elon-backend-db" database
- Use all 18 tables (8 original + 10 new after migration)

