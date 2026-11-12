const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FormField = sequelize.define('FormField', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  formId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'form_definitions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  fieldKey: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  label: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fieldType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'text'
  },
  isCore: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Built-in schema column vs administrator custom field'
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  defaultValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  validationRules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  options: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  conditionalRules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'disabled', 'archived']]
    }
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  archivedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  previousTypeHistory: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  tableName: 'form_fields',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['formId', 'fieldKey'],
      name: 'form_field_unique_key'
    }
  ]
});

module.exports = FormField;

