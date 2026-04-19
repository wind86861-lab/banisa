#!/bin/bash

echo "🔍 BANISA SERVER — PostgreSQL TEKSHIRUVI"
echo "========================================"
echo ""

ssh root@137.184.85.40 << 'EOF'
echo "1️⃣ PostgreSQL holati:"
echo "-------------------"
systemctl status postgresql | grep -E "Active:|Main PID:"
echo ""

echo "2️⃣ Database mavjudligi:"
echo "----------------------"
sudo -u postgres psql -l | grep -E "Name|banisa"
echo ""

echo "3️⃣ Jadvallar ro'yxati:"
echo "---------------------"
sudo -u postgres psql -d banisa_db -c "\dt" 2>/dev/null | head -20
echo ""

echo "4️⃣ Ma'lumotlar soni (asosiy jadvallar):"
echo "---------------------------------------"
sudo -u postgres psql -d banisa_db << 'SQL'
SELECT 
  'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Clinic', COUNT(*) FROM "Clinic"
UNION ALL
SELECT 'Appointment', COUNT(*) FROM "Appointment"
UNION ALL
SELECT 'ServiceReview', COUNT(*) FROM "ServiceReview"
UNION ALL
SELECT 'PaymeTransaction', COUNT(*) FROM "PaymeTransaction"
UNION ALL
SELECT 'DiagnosticService', COUNT(*) FROM "DiagnosticService"
UNION ALL
SELECT 'ClinicDiagnosticService', COUNT(*) FROM "ClinicDiagnosticService"
UNION ALL
SELECT 'HomepageSettings', COUNT(*) FROM "HomepageSettings"
ORDER BY table_name;
SQL
echo ""

echo "5️⃣ Oxirgi 5 ta appointment:"
echo "---------------------------"
sudo -u postgres psql -d banisa_db -c "SELECT id, status, \"scheduledAt\", \"createdAt\" FROM \"Appointment\" ORDER BY \"createdAt\" DESC LIMIT 5;" 2>/dev/null
echo ""

echo "6️⃣ Rollar bo'yicha foydalanuvchilar:"
echo "------------------------------------"
sudo -u postgres psql -d banisa_db -c "SELECT role, COUNT(*) as count FROM \"User\" GROUP BY role ORDER BY role;" 2>/dev/null
echo ""

echo "7️⃣ Klinikalar holati:"
echo "--------------------"
sudo -u postgres psql -d banisa_db -c "SELECT status, COUNT(*) as count FROM \"Clinic\" GROUP BY status ORDER BY status;" 2>/dev/null
echo ""

echo "8️⃣ Disk joy (database):"
echo "----------------------"
df -h | grep -E "Filesystem|/dev/vda"
echo ""

echo "9️⃣ PostgreSQL database hajmi:"
echo "----------------------------"
sudo -u postgres psql -d banisa_db -c "SELECT pg_size_pretty(pg_database_size('banisa_db')) as database_size;" 2>/dev/null
echo ""

echo "🔟 Uploads papka hajmi:"
echo "----------------------"
du -sh /root/banisa/backend/uploads/ 2>/dev/null || echo "Uploads papka topilmadi"
echo ""

echo "✅ Tekshiruv tugadi!"
EOF
