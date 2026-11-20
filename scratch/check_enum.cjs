const { sequelize } = require('../src/app/backend/config/database');

async function main() {
  await sequelize.authenticate();
  const [enumVals] = await sequelize.query(`
    SELECT e.enumlabel
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_placements_placementType';
  `);
  console.log('enum_placements_placementType labels:', enumVals);

  // Check how placements table has academicYear or batch
  const [samplePlacements] = await sequelize.query('SELECT id, "studentName", "studentId", department, course, batch, company, role, package, "placementType", "placementDate", "customFields" FROM placements LIMIT 3;');
  console.log('Sample placement row:', samplePlacements);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
