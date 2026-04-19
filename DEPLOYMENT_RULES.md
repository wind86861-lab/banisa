# 🚀 BANISA LOYIHASI — DEPLOYMENT QOIDALARI

## ⚠️ ASOSIY QOIDA
**HECH QACHON to'g'ridan-to'g'ri serverda kod o'zgartirmang!**

Serverda faqat quyidagilar saqlanadi:
- ✅ PostgreSQL ma'lumotlar (`/var/lib/postgresql/`)
- ✅ Yuklangan fayllar (`/root/banisa/backend/uploads/`)
- ✅ `.env` muhit o'zgaruvchilari
- ❌ Kod (har safar local dan deploy qilinadi)

---

## 📖 To'g'ri Workflow

### 1️⃣ Local da o'zgartirish
```bash
cd /home/user/Desktop/code/banisa
git checkout -b feature/yangi-funksiya
# kod yozish...
git add .
git commit -m "feat: yangi funksiya qo'shildi"
git push origin feature/yangi-funksiya
```

### 2️⃣ Main branch ga merge
```bash
git checkout main
git merge feature/yangi-funksiya
git push origin main
```

### 3️⃣ Serverga deploy

#### Backend Deploy
```bash
cd /home/user/Desktop/code/banisa/backend
npm run build  # TypeScript compile
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'uploads' \
  ./ root@137.184.85.40:/root/banisa/backend/
ssh root@137.184.85.40 "cd /root/banisa/backend && npm install --production && pm2 restart all"
```

#### Frontend Deploy
```bash
cd /home/user/Desktop/code/banisa/code
npm run build
rsync -az --delete dist/ root@137.184.85.40:/root/banisa/code/dist/
```

---

## 🛡️ Ma'lumotlar Himoyasi

### Database Backup (har kuni)
```bash
# Backup yaratish
ssh root@137.184.85.40 "sudo -u postgres pg_dump banisa > /root/backups/banisa_\$(date +%Y%m%d).sql"

# Local ga yuklab olish
scp root@137.184.85.40:/root/backups/banisa_*.sql /home/user/Desktop/code/banisa/backups/
```

### Uploads Backup
```bash
# Serverdan local ga nusxa olish
rsync -avz root@137.184.85.40:/root/banisa/backend/uploads/ \
  /home/user/Desktop/code/banisa/backups/uploads/
```

### Restore (agar kerak bo'lsa)
```bash
# Database restore
scp /home/user/Desktop/code/banisa/backups/banisa_20260409.sql root@137.184.85.40:/tmp/
ssh root@137.184.85.40 "sudo -u postgres psql banisa < /tmp/banisa_20260409.sql"

# Uploads restore
rsync -avz /home/user/Desktop/code/banisa/backups/uploads/ \
  root@137.184.85.40:/root/banisa/backend/uploads/
```

---

## ❌ QILMANG

1. ❌ `ssh root@137.184.85.40` → `nano /root/banisa/backend/src/...`
   - **Sabab:** Keyingi deploy o'zgarishlarni o'chiradi
   
2. ❌ Serverda `git pull` qilish
   - **Sabab:** Conflict kelib qolishi mumkin, server production muhit
   
3. ❌ `.env` faylini git ga commit qilish
   - **Sabab:** Maxfiy ma'lumotlar (parollar, API keys) oshkor bo'ladi
   
4. ❌ `node_modules` ni rsync qilish
   - **Sabab:** Juda sekin, serverda `npm install` yaxshiroq
   
5. ❌ `uploads/` papkasini deploy qilish
   - **Sabab:** Foydalanuvchi yuklagan fayllar o'chib ketadi

---

## ✅ QILING

1. ✅ Har doim local da ishlang
2. ✅ Git commit qiling (meaningful message bilan)
3. ✅ Deploy qilishdan oldin local da test qiling
4. ✅ Muhim o'zgarishlardan oldin database backup oling
5. ✅ `.env` faylni serverda alohida saqlang
6. ✅ `rsync` da `--exclude` ishlatib, kerakli fayllarni himoya qiling

---

## 🔄 Tez Deploy (Alias)

`~/.bashrc` ga qo'shing:

```bash
# Backend deploy
alias deploy-backend='cd /home/user/Desktop/code/banisa/backend && npm run build && rsync -avz --exclude node_modules --exclude .env --exclude uploads ./ root@137.184.85.40:/root/banisa/backend/ && ssh root@137.184.85.40 "cd /root/banisa/backend && npm install --production && pm2 restart all"'

# Frontend deploy
alias deploy-frontend='cd /home/user/Desktop/code/banisa/code && npm run build && rsync -az --delete dist/ root@137.184.85.40:/root/banisa/code/dist/'

# Database backup
alias backup-db='ssh root@137.184.85.40 "sudo -u postgres pg_dump banisa > /root/backups/banisa_$(date +%Y%m%d).sql" && scp root@137.184.85.40:/root/backups/banisa_*.sql /home/user/Desktop/code/banisa/backups/'
```

Keyin ishlatish:
```bash
deploy-backend
deploy-frontend
backup-db
```

---

## 🆘 Muammo Yechish

### Server ishlamayapti
```bash
ssh root@137.184.85.40
pm2 logs  # xatolarni ko'rish
pm2 restart all
systemctl status postgresql
```

### Database ulanmayapti
```bash
ssh root@137.184.85.40
sudo -u postgres psql -d banisa -c "SELECT version();"
# .env faylda DATABASE_URL to'g'ri ekanligini tekshiring
```

### Fayllar yuklanmayapti
```bash
ssh root@137.184.85.40
ls -la /root/banisa/backend/uploads/images/
chmod -R 755 /root/banisa/backend/uploads/
```

---

## 📝 Eslatma

**Har safar deploy qilishdan oldin:**
1. Local da test qiling (`npm run dev`)
2. Git commit qiling
3. Backup oling (muhim o'zgarishlar uchun)
4. Deploy qiling
5. Serverda test qiling (https://banisa.uz)

**Agar xatolik bo'lsa:**
- `pm2 logs` orqali xatoni toping
- Local da tuzating
- Qayta deploy qiling
