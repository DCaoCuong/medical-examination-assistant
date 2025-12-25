# 📚 Turso Migration - Tài liệu hướng dẫn

## 🎯 Bạn đang ở đâu?

### **Tôi muốn setup NHANH nhất (Web UI - Recommended)** ⚡
→ Đọc: **[QUICK_START.md](./QUICK_START.md)**
- ✅ Không cần cài CLI
- ✅ Làm trên web dashboard
- ✅ 5 bước đơn giản
- ⏱️ **10 phút**

---

### **Tôi muốn hướng dẫn CHI TIẾT qua Web** 📖
→ Đọc: **[TURSO_WEB_SETUP.md](./TURSO_WEB_SETUP.md)**
- ✅ Giải thích từng bước
- ✅ Có troubleshooting
- ✅ Có SQL schema đầy đủ
- ⏱️ **15 phút**

---

### **Tôi muốn dùng CLI (Advanced)** 💻
→ Đọc: **[TURSO_MIGRATION_GUIDE.md](./TURSO_MIGRATION_GUIDE.md)**
- Cài Turso CLI
- Setup qua terminal
- Import data từ SQLite cũ
- ⏱️ **20 phút**

---

## 🚀 Recommended Flow (cho người mới)

```
1. QUICK_START.md (đọc qua nhanh, hiểu flow)
   ↓
2. TURSO_WEB_SETUP.md (làm theo chi tiết)
   ↓
3. Deploy & Test
   ↓
4. Done! 🎉
```

---

## 📝 Tóm tắt vấn đề

**Lỗi:** `SQLITE_READONLY - attempt to write a readonly database`

**Nguyên nhân:** Vercel có filesystem READ-ONLY → không thể dùng SQLite local

**Giải pháp:** Migrate sang **Turso** (SQLite cloud) ✅

---

## ✅ Các file đã được cập nhật

- ✅ `src/lib/db/index.ts` - Database connection (Turso)
- ✅ `drizzle.config.ts` - Drizzle config (dialect: turso)
- ✅ `package.json` - Added @libsql/client

**Code đã sẵn sàng!** Chỉ cần setup Turso database và Vercel env vars.

---

## 🎯 TL;DR - Làm gì tiếp theo?

1. **Tạo database trên Turso**: https://turso.tech/app
2. **Copy** Database URL + Auth Token
3. **Thêm vào Vercel** Environment Variables
4. **Push schema**: `npx drizzle-kit push`
5. **Deploy**: `git push`

**Chi tiết:** Xem [QUICK_START.md](./QUICK_START.md)

---

## 📞 Support

Có lỗi? → Xem phần **Troubleshooting** trong mỗi guide

---

**Chúc bạn setup thành công! 🚀**
