const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testPasswordUpdate() {
    const clinicId = 'd7550640-811b-4440-87f5-f41a4799f590';
    const newPassword = 'NewTestPass123!';
    
    console.log('1. Finding existing CLINIC_ADMIN user for clinic:', clinicId);
    const existingUser = await prisma.user.findFirst({
        where: {
            clinicId: clinicId,
            role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
            isActive: true,
        }
    });
    
    if (!existingUser) {
        console.log('❌ No user found!');
        return;
    }
    
    console.log('✅ Found user:', existingUser.id, existingUser.phone);
    
    console.log('2. Updating password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash }
    });
    
    console.log('✅ Password updated!');
    
    console.log('3. Testing new password...');
    const user = await prisma.user.findUnique({ where: { id: existingUser.id } });
    const match = await bcrypt.compare(newPassword, user.passwordHash);
    console.log('Password match:', match ? '✅' : '❌');
    
    console.log('\n📱 You can now log in with:');
    console.log('Phone:', existingUser.phone);
    console.log('Password:', newPassword);
}

testPasswordUpdate()
    .finally(() => prisma.$disconnect());
