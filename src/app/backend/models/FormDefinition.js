const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FormDefinition = sequelize.define('FormDefinition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  moduleKey: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  formKey: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  formName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tableNameRef: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Underlying PostgreSQL table name for compatibility checks'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'form_definitions',
  timestamps: true
});

module.exports = FormDefinition;

