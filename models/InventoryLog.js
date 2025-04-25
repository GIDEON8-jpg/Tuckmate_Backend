const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryLog = sequelize.define('InventoryLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    quantity_change: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notZero(value) {
                if (value === 0) {
                    throw new Error('Quantity change cannot be zero');
                }
            }
        }
    },
    reason: {
        type: DataTypes.ENUM(
            'sale',
            'restock',
            'return',
            'reservation',
            'expiration',
            'adjustment'
        ),
        allowNull: false
    },
    reference_id: {
        type: DataTypes.INTEGER,
        comment: 'Order ID, Restock ID, etc.'
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    timestamps: true,
    underscored: true,
    tableName: 'inventory_logs',
    indexes: [
        {
            fields: ['product_id']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['reason']
        }
    ]
});

// Class methods
InventoryLog.getInventoryHistory = async function(productId, limit = 100) {
    return this.findAll({
        where: { product_id: productId },
        order: [['created_at', 'DESC']],
        limit,
        attributes: [
            'id',
            'quantity_change',
            'reason',
            'reference_id',
            'created_at',
            'notes'
        ]
    });
};

InventoryLog.getCurrentStock = async function(productId) {
    const result = await this.findOne({
        where: { product_id: productId },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('quantity_change')), 'total_change']
        ],
        raw: true
    });

    return result.total_change || 0;
};

module.exports = InventoryLog;