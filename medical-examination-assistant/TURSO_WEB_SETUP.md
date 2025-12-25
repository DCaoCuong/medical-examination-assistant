# 🌐 Setup Turso qua Web Dashboard (Không cần CLI)

## ✨ Cách này DỄ HƠN và NHANH HƠN!

Không cần cài CLI, không cần chạy local. Làm mọi thứ trên trình duyệt!

---

## 📝 HƯỚNG DẪN CHI TIẾT

### **Bước 1: Tạo Database trên Turso Dashboard**

1. **Đăng nhập vào Turso Dashboard:**
   - Truy cập: https://turso.tech/app
   - Login bằng GitHub account (bạn đã có rồi ✅)

2. **Tạo Database mới:**
   - Click nút **"Create Database"** (góc trên bên phải)
   - Nhập tên database: `medical-exam-db` (hoặc tên bạn thích)
   - Chọn **Location**: 
     - Recommended: **Singapore** (gần Việt Nam nhất, ping thấp)
     - Hoặc: **Tokyo, Hong Kong**
   - Click **"Create"**

3. **Chờ database được tạo** (1-2 giây)

---

### **Bước 2: Lấy Connection Credentials**

Sau khi database được tạo xong:

1. **Vào trang chi tiết database:**
   - Click vào database `medical-exam-db` vừa tạo
   - Bạn sẽ thấy 2 thông tin quan trọng:

2. **Copy DATABASE URL:**
   ```
   libsql://medical-exam-db-[your-username].turso.io
   ```
   - Click vào icon **Copy** bên cạnh "Database URL"
   - Hoặc tab **"Connect"** để xem rõ hơn

3. **Tạo Authentication Token:**
   - Vào tab **"Tokens"** (hoặc "Data Tokens")
   - Click **"Create Token"**
   - Nhập tên: `vercel-production` (để dễ nhớ)
   - Click **"Create"**
   - **QUAN TRỌNG**: Copy token này ngay! Chỉ hiện 1 lần duy nhất
   ```
   eyJhbG...rất_dài (khoảng 200-300 ký tự)
   ```

4. **Lưu 2 thông tin này:**
   ```
   TURSO_DATABASE_URL=libsql://medical-exam-db-[your-username].turso.io
   TURSO_AUTH_TOKEN=eyJhbG...
   ```

---

### **Bước 3: Cấu hình Vercel Environment Variables**

1. **Vào Vercel Dashboard:**
   - Truy cập: https://vercel.com/
   - Chọn project của bạn: `medical-examination-assistant`

2. **Thêm Environment Variables:**
   - Vào tab **"Settings"** (thanh menu bên trái)
   - Chọn **"Environment Variables"**
   - Click **"Add New"**

3. **Thêm biến thứ nhất:**
   - **Name**: `TURSO_DATABASE_URL`
   - **Value**: `libsql://medical-exam-db-[your-username].turso.io`
   - **Environments**: ✅ Check cả 3:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click **"Save"**

4. **Thêm biến thứ hai:**
   - Click **"Add New"** tiếp
   - **Name**: `TURSO_AUTH_TOKEN`
   - **Value**: `eyJhbG...` (token dài)
   - **Environments**: ✅ Check cả 3
   - Click **"Save"**

✅ **Xong phần cấu hình Vercel!**

---

### **Bước 4: Push Database Schema lên Turso**

Bạn có 2 cách:

#### **Cách 1: Push từ Local (Recommended - dễ nhất)**

Trước tiên, tạo file `.env.local` ở local để test:

```env
# File: .env.local
TURSO_DATABASE_URL=libsql://medical-exam-db-[your-username].turso.io
TURSO_AUTH_TOKEN=eyJhbG...
```

Sau đó chạy:

```bash
# Push schema lên Turso
npx drizzle-kit push
```

Drizzle sẽ hỏi bạn confirm, chọn **Yes**.

#### **Cách 2: Tạo tables bằng SQL trực tiếp trên Turso Dashboard**

1. Vào **Turso Dashboard** → Database `medical-exam-db`
2. Vào tab **"SQL Shell"** (hoặc "Query Editor")
3. Copy và chạy từng schema file:

**Tạo bảng Patients:**
```sql
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    display_id TEXT NOT NULL UNIQUE,
    external_patient_id TEXT,
    name TEXT NOT NULL,
    birth_date TEXT,
    gender TEXT,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    medical_history TEXT,
    allergies TEXT,
    blood_type TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

**Tạo bảng Examination Sessions:**
```sql
CREATE TABLE IF NOT EXISTS examination_sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    visit_number INTEGER NOT NULL,
    chief_complaint TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

**Tạo bảng Medical Records:**
```sql
CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    icd10_codes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES examination_sessions(id)
);
```

**Tạo bảng Comparison Records:**
```sql
CREATE TABLE IF NOT EXISTS comparison_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    ai_soap_note TEXT NOT NULL,
    ai_icd10_codes TEXT,
    doctor_soap_note TEXT NOT NULL,
    doctor_icd10_codes TEXT,
    soap_similarity_score REAL,
    icd10_match_score REAL,
    overall_match_score REAL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES examination_sessions(id)
);
```

4. Click **"Run"** hoặc **"Execute"** cho từng câu lệnh

---

### **Bước 5: Deploy lên Vercel**

1. **Commit code changes:**
   ```bash
   git add .
   git commit -m "Migrate to Turso cloud database"
   git push
   ```

2. **Vercel tự động deploy** (hoặc click "Redeploy" trên Dashboard)

3. **Chờ deployment hoàn thành** (1-2 phút)

---

## ✅ Kiểm tra kết quả

### **1. Kiểm tra Deployment Logs:**
- Vào **Vercel Dashboard** → Project → **Deployments**
- Click vào deployment mới nhất
- Xem **Build Logs** và **Function Logs**
- Không có lỗi về database = ✅ Thành công!

### **2. Test trên Production:**
- Mở app trên Vercel URL: `https://your-app.vercel.app`
- Thử tạo một Patient mới
- Nếu tạo thành công → ✅ Hoàn tất!

### **3. Kiểm tra data trên Turso Dashboard:**
- Vào **Turso Dashboard** → Database
- Tab **"SQL Shell"**
- Chạy query:
  ```sql
  SELECT * FROM patients LIMIT 10;
  ```
- Thấy data vừa tạo = ✅ Perfect!

---

## 🎯 Tóm tắt quy trình

1. ✅ Tạo database trên **Turso Dashboard** (web)
2. ✅ Copy **Database URL** và tạo **Auth Token**
3. ✅ Thêm 2 biến vào **Vercel Environment Variables**
4. ✅ Push schema lên Turso (chọn 1 trong 2 cách)
5. ✅ Git push → Vercel tự deploy
6. ✅ Test production → Done!

---

## 💡 Ưu điểm của cách này

- ✅ **Không cần cài CLI** (làm mọi thứ trên web)
- ✅ **Không cần run local** (deploy thẳng production)
- ✅ **Dễ quản lý** (tất cả trên dashboard)
- ✅ **Nhanh hơn** (ít bước hơn)

---

## 🔧 Troubleshooting

### **Lỗi: Environment variables not found**
- Đảm bảo đã lưu variables trên Vercel
- **PHẢI Redeploy** sau khi thêm biến mới

### **Lỗi: Cannot connect to database**
- Kiểm tra `TURSO_DATABASE_URL` đúng format
- Kiểm tra `TURSO_AUTH_TOKEN` không bị cắt/thiếu ký tự

### **Lỗi: Table not found**
- Chưa push schema → Chạy `npx drizzle-kit push`
- Hoặc tạo tables manual trên Turso SQL Shell

---

## 📚 Links hữu ích

- [Turso Dashboard](https://turso.tech/app) - Quản lý database
- [Vercel Dashboard](https://vercel.com/) - Quản lý deployments
- [Turso Docs](https://docs.turso.tech) - Documentation

---

## ⚡ Quick Reference

**Turso Dashboard:**
- Create Database: https://turso.tech/app → "Create Database"
- SQL Shell: Database → "SQL Shell" tab
- Tokens: Database → "Tokens" tab

**Vercel Dashboard:**
- Environment Variables: Project → Settings → Environment Variables
- Deployments: Project → Deployments tab
