'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add columns to scopus_sources
    const scopusSourceTable = await queryInterface.describeTable('scopus_sources');
    
    if (!scopusSourceTable.publisher) {
      await queryInterface.addColumn('scopus_sources', 'publisher', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!scopusSourceTable.sourceType) {
      await queryInterface.addColumn('scopus_sources', 'sourceType', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!scopusSourceTable.scopusUrl) {
      await queryInterface.addColumn('scopus_sources', 'scopusUrl', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!scopusSourceTable.subjectAreas) {
      await queryInterface.addColumn('scopus_sources', 'subjectAreas', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!scopusSourceTable.sjrByYear) {
      await queryInterface.addColumn('scopus_sources', 'sjrByYear', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }

    if (!scopusSourceTable.snipByYear) {
      await queryInterface.addColumn('scopus_sources', 'snipByYear', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }

    if (!scopusSourceTable.scholarlyOutputByYear) {
      await queryInterface.addColumn('scopus_sources', 'scholarlyOutputByYear', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }

    if (!scopusSourceTable.metricsHistory) {
      await queryInterface.addColumn('scopus_sources', 'metricsHistory', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!scopusSourceTable.nextRefreshAt) {
      await queryInterface.addColumn('scopus_sources', 'nextRefreshAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!scopusSourceTable.lastRefreshStatus) {
      await queryInterface.addColumn('scopus_sources', 'lastRefreshStatus', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    // 2. Add columns to citation_yearly_details
    const yearlyTable = await queryInterface.describeTable('citation_yearly_details');

    if (!yearlyTable.excludingSelfCount) {
      await queryInterface.addColumn('citation_yearly_details', 'excludingSelfCount', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!yearlyTable.citationType) {
      await queryInterface.addColumn('citation_yearly_details', 'citationType', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'all'
      });
    }

    if (!yearlyTable.source) {
      await queryInterface.addColumn('citation_yearly_details', 'source', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'Scopus'
      });
    }
  },

  down: async (queryInterface) => {
    // Reversible
    const scopusSourceTable = await queryInterface.describeTable('scopus_sources');
    const cols = ['publisher', 'sourceType', 'scopusUrl', 'subjectAreas', 'sjrByYear', 'snipByYear', 'scholarlyOutputByYear', 'metricsHistory', 'nextRefreshAt', 'lastRefreshStatus'];
    for (const c of cols) {
      if (scopusSourceTable[c]) {
        await queryInterface.removeColumn('scopus_sources', c);
      }
    }

    const yearlyTable = await queryInterface.describeTable('citation_yearly_details');
    if (yearlyTable.excludingSelfCount) await queryInterface.removeColumn('citation_yearly_details', 'excludingSelfCount');
    if (yearlyTable.citationType) await queryInterface.removeColumn('citation_yearly_details', 'citationType');
    if (yearlyTable.source) await queryInterface.removeColumn('citation_yearly_details', 'source');
  }
};
