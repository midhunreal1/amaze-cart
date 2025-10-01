require('dotenv').config();
const db = require('./config/connection');
const userHelpers = require('./helpers/user-helpers');

const adminSeeds = [
    {
        Name: process.env.ADMIN_NAME || 'Super Admin',
        Email: process.env.ADMIN_EMAIL || 'admin@amazecart.com',
        Password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'super_admin'
    },
    {
        Name: 'Store Manager',
        Email: 'manager@amazecart.com', 
        Password: 'Manager@123',
        role: 'admin'
    }
];

async function seedAdmins() {
    try {
        console.log('🌱 Starting admin user seeding...');
        await new Promise((resolve, reject) => {
            db.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        let created = 0;
        let existing = 0;
        
        for (const adminData of adminSeeds) {
            try {
                await userHelpers.createAdminUser(adminData);
                console.log(`✅ Created admin: ${adminData.Email} (${adminData.role})`);
                created++;
            } catch (error) {
                if (error.message === 'Admin user already exists') {
                    console.log(`⚠️  Admin already exists: ${adminData.Email}`);
                    existing++;
                } else {
                    console.error(`❌ Error creating admin ${adminData.Email}:`, error.message);
                }
            }
        }
        
        console.log('\n📊 Seeding Summary:');
        console.log(`   Created: ${created} admin(s)`);
        console.log(`   Existing: ${existing} admin(s)`);
        console.log(`   Total attempted: ${adminSeeds.length}`);
        
        if (created > 0) {
            console.log('\n🔐 Default credentials (change immediately):');
            adminSeeds.forEach(admin => {
                console.log(`   ${admin.Email} / [password in .env or default]`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    seedAdmins();
}

module.exports = { seedAdmins };