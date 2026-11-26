'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create report_snapshots table
    await queryInterface.createTable('report_snapshots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      snapshotId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      reportType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'analytical'
      },
      outputFormat: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pdf'
      },
      scopeConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      contentConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      comparisonConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      stylingConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      reportData: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      dataProvenance: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      checksum: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    }).catch(err => {
      // Table might already exist
      console.log('report_snapshots table creation notice:', err.message);
    });

    // 2. Add V2 columns to saved_report_configs
    try {
      await queryInterface.addColumn('saved_report_configs', 'isPublished', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('saved_report_configs', 'version', {
        type: Sequelize.INTEGER,
        defaultValue: 1
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('saved_report_configs', 'isSystemTemplate', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    } catch (e) {}

    // 3. Add V2 columns to report_history
    try {
      await queryInterface.addColumn('report_history', 'snapshotId', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('report_history', 'templateId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('report_history', 'configVersion', {
        type: Sequelize.INTEGER,
        defaultValue: 1
      });
    } catch (e) {}
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('report_snapshots').catch(() => {});
  }
};
