const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('ecocash', 'cash'),
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.STRING(100)
    },
    phone_number: {
        type: DataTypes.STRING(20)
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    payment_details: {
        type: DataTypes.JSON
    }
}, {
    timestamps: true,
    underscored: true,
    tableName: 'payments'
});

module.exports = Payment;