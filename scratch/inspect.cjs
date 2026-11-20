const { sequelize } = require('../src/app/backend/config/database');

async function main() {
  await sequelize.authenticate();
  const [types] = await sequelize.query('SELECT DISTINCT "placementType", count(*) FROM placements GROUP BY "placementType";');
  console.log('placementType values:', types);

  const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%rate%' OR table_name LIKE '%currency%' OR table_name LIKE '%intern%');");
  console.log('currency/rate/intern tables:', tables);

  const [internshipSample] = await sequelize.query('SELECT * FROM placements WHERE "placementType"::text ILIKE \'%intern%\' LIMIT 3;');
  console.log('Sample internship rows in placements:', internshipSample);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
