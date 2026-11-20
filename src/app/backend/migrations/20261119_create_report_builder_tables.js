'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. saved_report_configs
    await queryInterface.createTable('saved_report_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reportType: {
        type: Sequelize.STRING,
        defaultValue: 'analytical'
      },
      outputFormat: {
        type: Sequelize.STRING,
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
      isShared: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 2. report_history
    await queryInterface.createTable('report_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      reportName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      reportType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      outputFormat: {
        type: Sequelize.STRING,
        allowNull: false
      },
      scopeSummary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reportingPeriod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sectionsCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      pageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      fileUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fileSize: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'completed'
      },
      configSnapshot: {
        type: Sequelize.JSONB,
        defaultValue: {}
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
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    try {
      await queryInterface.addIndex('saved_report_configs', ['createdBy']);
      await queryInterface.addIndex('saved_report_configs', ['name']);
      await queryInterface.addIndex('report_history', ['createdBy']);
      await queryInterface.addIndex('report_history', ['createdAt']);
    } catch (idxErr) {
      // Non-fatal if index exists
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('report_history');
    await queryInterface.dropTable('saved_report_configs');
  }
};
