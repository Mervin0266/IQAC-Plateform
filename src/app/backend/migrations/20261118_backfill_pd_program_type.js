'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Populate programType from title where programType IS NULL
    await queryInterface.sequelize.query(`
      UPDATE "professional_developments"
      SET "programType" = "title"
      WHERE "programType" IS NULL AND "title" IS NOT NULL;
    `);

    // Add index on programType for high-performance filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_pd_programType" ON "professional_developments" ("programType");
    `);

    // Add index on invited_talks programType
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_it_programType" ON "invited_talks" ("programType");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_pd_programType";`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_it_programType";`);
  }
};
