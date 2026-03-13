// Run: node reset-admin-password.js <new_password>
// Example: node reset-admin-password.js MyNewPassword123
require('dotenv').config()
const bcrypt = require('bcrypt')
const { query, initDatabase } = require('./src/config/database')

const run = async () => {
  const newPassword = process.argv[2]
  if (!newPassword || newPassword.length < 6) {
    console.error('Usage: node reset-admin-password.js <password> (min 6 chars)')
    process.exit(1)
  }

  try {
    await initDatabase()
    const hash = await bcrypt.hash(newPassword, 10)
    await query(
      `INSERT INTO admins (login, password_hash) VALUES ('admin', $1)
       ON CONFLICT (login) DO UPDATE SET password_hash = $1, updated_at = NOW()`,
      [hash]
    )
    console.log(`✅ Admin password updated successfully`)
    console.log(`   Login: admin`)
    console.log(`   Password: ${newPassword}`)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

run()
