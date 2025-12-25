# 🚀 Migration Guide: SQLite Local → Turso Cloud

## Vấn đề hiện tại

**Lỗi**: `SQLITE_READONLY - attempt to write a readonly database`

**Nguyên nhân**: Vercel là serverless platform với filesystem READ-ONLY, không thể sử dụng SQLite local file-based database.

**Giải pháp**: Migrate sang **Turso** (SQLite trên cloud)

---

## ✅ Tại sao chọn Turso?

- ✅ Vẫn sử dụng SQLite syntax (không cần thay đổi schema)
- ✅ Tương thích với Drizzle ORM hiện tại
- ✅ Free tier: 500 databases, 9GB storage
- ✅ Edge-compatible, cực nhanh
- ✅ Chỉ cần thay đổi connection code

---

## 📝 Các bước thực hiện

### **Bước 1: Cài đặt Turso CLI**

**Trên Windows (PowerShell - chạy as Administrator):**
```powershell
irm get.turso.tech/install.ps1 | iex
```

**Hoặc dùng npm:**
```bash
npm install -g @turso/cli
```

**Kiểm tra cài đặt:**
```bash
turso --version
```

---

### **Bước 2: Tạo Turso Database**

**Login vào Turso:**
```bash
turso auth login
```
> Sẽ mở browser để bạn đăng nhập (có thể dùng GitHub account)

**Tạo database mới:**
```bash
turso db create medical-exam-db
```

**Lấy thông tin database:**
```bash
# Xem chi tiết database
turso db show medical-exam-db

# Lấy DATABASE_URL
turso db show medical-exam-db --url

# Tạo AUTH TOKEN
turso db tokens create medical-exam-db
```

**Lưu lại 2 giá trị này:**
- `DATABASE_URL`: libsql://medical-exam-db-[your-username].turso.io
- `DATABASE_AUTH_TOKEN`: eyJh... (token dài)

---

### **Bước 3: Cài đặt dependencies**

```bash
npm install @libsql/client
```

---

### **Bước 4: Tạo file môi trường**

**Tạo file `.env.local` (cho local development):**
```env
# Turso Database
TURSO_DATABASE_URL=libsql://medical-exam-db-[your-username].turso.io
TURSO_AUTH_TOKEN=your_token_here
```

**Thêm vào `.gitignore`:**
```
.env.local
.env*.local
```

---

### **Bước 5: Cập nhật Database Connection**

File: `src/lib/db/index.ts` đã được tạo phiên bản mới (xem file bên dưới)

---

### **Bước 6: Push Schema lên Turso**

Bạn có 2 cách:

#### **Cách 1: Sử dụng Drizzle Push (Recommended)**

```bash
# Cài drizzle-kit nếu chưa có
npm install -D drizzle-kit

# Push schema lên Turso
npx drizzle-kit push
```

#### **Cách 2: Import từ SQLite file hiện tại**

```bash
# Dump database hiện tại
turso db shell medical-exam-db < data/db/medical_assistant.db

# Hoặc import từ SQL file
sqlite3 data/db/medical_assistant.db .dump > backup.sql
turso db shell medical-exam-db < backup.sql
```

---

### **Bước 7: Cấu hình Vercel Environment Variables**

Trên Vercel Dashboard:

1. Vào **Project Settings** → **Environment Variables**
2. Thêm 2 biến:
   - `TURSO_DATABASE_URL`: `libsql://medical-exam-db-...`
   - `TURSO_AUTH_TOKEN`: `eyJh...`
3. Chọn **Production**, **Preview**, **Development**
4. Click **Save**

---

### **Bước 8: Deploy lại lên Vercel**

```bash
# Commit changes
git add .
git commit -m "Migrate to Turso database for Vercel deployment"
git push

# Vercel sẽ tự động deploy
```

Hoặc:
```bash
vercel --prod
```

---

## 🧪 Testing

### **Test local:**
```bash
npm run dev
```

### **Test trên Turso shell:**
```bash
turso db shell medical-exam-db

# Chạy queries
SELECT * FROM patients LIMIT 5;
.quit
```

---

## 🔧 Troubleshooting

### **Lỗi: "cannot open database file"**
- Kiểm tra `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` trong `.env.local`
- Restart development server

### **Lỗi: "table not found"**
- Chạy `npx drizzle-kit push` để tạo tables

### **Lỗi khi deploy Vercel**
- Kiểm tra Environment Variables trên Vercel Dashboard
- Redeploy

---

## 📚 Resources

- [Turso Documentation](https://docs.turso.tech)
- [Drizzle + Turso Guide](https://orm.drizzle.team/docs/get-started-sqlite#turso)
- [Turso Dashboard](https://turso.tech/app)

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG commit** `.env.local` lên git (đã có trong .gitignore)
2. **KHÔNG share** `TURSO_AUTH_TOKEN` công khai
3. **Backup** database thường xuyên:
   ```bash
   turso db shell medical-exam-db .dump > backup-$(date +%Y%m%d).sql
   ```
4. Free tier có giới hạn:
   - 500 databases
   - 9GB storage
   - 1 billion row reads/month
