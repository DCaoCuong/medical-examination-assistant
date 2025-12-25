# 🚀 HƯỚNG DẪN NHANH - Turso qua Web (Không cần CLI)

## ⚡ 5 BƯỚC ĐƠN GIẢN

### **BƯỚC 1: Tạo Database trên Turso** 🗄️

1. Vào https://turso.tech/app
2. Click **"Create Database"**
3. Điền:
   - Name: `medical-exam-db`
   - Location: **Singapore** (hoặc Tokyo)
4. Click **"Create"**

---

### **BƯỚC 2: Lấy Credentials** 🔑

**A. Database URL:**
- Copy URL xuất hiện trên màn hình
- Format: `libsql://medical-exam-db-[username].turso.io`

**B. Auth Token:**
- Tab **"Tokens"** → **"Create Token"**
- Name: `vercel-production`
- Click **"Create"** → **Copy token ngay!**
- Format: `eyJhbG...` (dài ~300 ký tự)

**📝 Lưu 2 giá trị này lại!**

---

### **BƯỚC 3: Cấu hình Vercel** ⚙️

1. Vào https://vercel.com/ → Chọn project
2. **Settings** → **Environment Variables**
3. Thêm 2 biến:

**Biến 1:**
```
Name: TURSO_DATABASE_URL
Value: libsql://medical-exam-db-[your-username].turso.io
Environments: ✅ Production ✅ Preview ✅ Development
```

**Biến 2:**
```
Name: TURSO_AUTH_TOKEN  
Value: eyJhbG... (token dài)
Environments: ✅ Production ✅ Preview ✅ Development
```

4. Click **"Save"** cho mỗi biến

---

### **BƯỚC 4: Push Database Schema** 📊

**Chọn 1 trong 2 cách:**

#### **Cách A: Từ Local (Recommended)**

Tạo file `.env.local`:
```env
TURSO_DATABASE_URL=libsql://medical-exam-db-[username].turso.io
TURSO_AUTH_TOKEN=eyJhbG...
```

Chạy lệnh:
```bash
npx drizzle-kit push
```

Chọn **Yes** khi được hỏi.

#### **Cách B: SQL trực tiếp trên Turso**

Vào **Turso Dashboard** → Database → **"SQL Shell"**

Copy và chạy từng câu lệnh:

```sql
-- 1. Patients table
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

-- 2. Examination Sessions table
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

-- 3. Medical Records table
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

-- 4. Comparison Records table
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

Click **"Run"** sau mỗi câu lệnh.

---

### **BƯỚC 5: Deploy** 🚀

```bash
git add .
git commit -m "Migrate to Turso cloud database"
git push
```

Vercel sẽ tự động deploy!

---

## ✅ KIỂM TRA

### **1. Xem Deployment Logs:**
Vercel Dashboard → Deployments → Click deployment mới nhất

### **2. Test Production:**
Mở app: `https://your-app.vercel.app`
→ Thử tạo patient mới

### **3. Check database:**
Turso Dashboard → SQL Shell:
```sql
SELECT * FROM patients;
```

---

## 🎯 CHECKLIST

- [ ] Tạo database trên Turso Dashboard
- [ ] Copy Database URL
- [ ] Tạo và copy Auth Token
- [ ] Thêm 2 biến vào Vercel Environment Variables
- [ ] Push schema lên Turso (drizzle-kit hoặc SQL)
- [ ] Git push
- [ ] Test production

---

## ⚠️ LƯU Ý

1. **Auth Token chỉ hiện 1 lần** → Copy ngay!
2. **Phải Redeploy** sau khi thêm Environment Variables
3. **Không commit** `.env.local` lên git

---

## 🆘 GẶP LỖI?

**Lỗi kết nối database:**
→ Kiểm tra lại 2 biến environment trên Vercel
→ Redeploy

**Table not found:**
→ Chưa push schema → Làm lại Bước 4

**Xem chi tiết:**
→ Đọc [TURSO_WEB_SETUP.md](./TURSO_WEB_SETUP.md)

---

## 📱 LINKS NHANH

- **Turso Dashboard**: https://turso.tech/app
- **Vercel Dashboard**: https://vercel.com/
- **Chi tiết đầy đủ**: [TURSO_WEB_SETUP.md](./TURSO_WEB_SETUP.md)
