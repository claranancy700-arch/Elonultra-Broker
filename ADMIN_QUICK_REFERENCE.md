# 🎯 Admin System - Quick Reference

## Admin Key
```
elonu_admin_key_251104
```

## URLs
```
Frontend:  http://localhost:8080/admin.html
Backend:   http://localhost:5001
API Base:  http://localhost:5001/api
```

## Start Commands
```bash
# Terminal 1 - Start Backend
npm run server:dev

# Terminal 2 - Start Frontend
npm start

# Terminal 3 - Test Endpoints
node test-admin.js
```

## Main Admin Features

| Feature | Location | Shortcut |
|---------|----------|----------|
| 👥 Users | Users modal button | Load → View Users |
| 💳 Transactions | Tabs (All/Deposits/Withdrawals/Trades) | Click tabs |
| 📝 Testimonies | Testimonies section | View/Approve/Delete |
| ⚙️ Simulator | Simulator control card | Start/Pause |
| 💰 Balance | Balance management card | Enter amount → Apply |
| 📊 Portfolio | Portfolio section | View allocation |

## API Endpoints

**Users:**
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `GET /api/admin/users/:id/portfolio`
- `GET /api/admin/users/:id/transactions`
- `POST /api/admin/users/:id/set-balance`
- `POST /api/admin/users/:id/set-portfolio`

**Transactions:**
- `GET /api/admin/transactions`
- `POST /api/admin/transactions`
- `DELETE /api/admin/transactions/:id`

**Testimonies:**
- `GET /api/admin/testimonies`
- `POST /api/admin/testimonies/:id/approve`
- `DELETE /api/admin/testimonies/:id`

**Simulator:**
- `GET /api/admin/users/:id/simulator`
- `POST /api/admin/users/:id/simulator/start`
- `POST /api/admin/users/:id/simulator/pause`

**Other:**
- `POST /api/admin/credit`
- `GET /api/admin/verify-key`

## Request Headers

All admin API calls require:
```
x-admin-key: elonu_admin_key_251104
Content-Type: application/json
```

## Example Request

```bash
curl -X GET http://localhost:5001/api/admin/users \
  -H "x-admin-key: elonu_admin_key_251104" \
  -H "Content-Type: application/json"
```

## Configuration

`.env` settings:
```
PORT=5001
ADMIN_KEY=elonu_admin_key_251104
ADMIN_API_KEY=elonu_admin_key_251104
DATABASE_URL=postgresql://...
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Fix DATABASE_URL (see ADMIN_SYSTEM_SETUP.md) |
| 404 on endpoints | Start backend with `npm run server:dev` |
| Can't load users | Enter correct admin key |
| Users list empty | Seed database with `node seed-users.js` |
| Network error | Check if localhost:5001 is accessible |

## Documents

- `ADMIN_SYSTEM_SETUP.md` - Complete setup guide
- `ADMIN_IMPLEMENTATION.md` - Implementation details
- `test-admin.js` - Run endpoint tests
- `diagnose-admin.js` - Verify configuration

## 🔴 Current Status

**BLOCKED:** PostgreSQL database is not reachable

**Action Required:** Fix database connection (see ADMIN_SYSTEM_SETUP.md section "Fix Database Connection")

---

Once database is fixed, admin system is ready to use!
