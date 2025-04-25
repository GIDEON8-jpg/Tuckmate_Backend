'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('orders', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'processing', 'ready', 'completed', 'cancelled'),
                defaultValue: 'pending'
            },
            total_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            payment_method: {
                type: Sequelize.ENUM('ecocash', 'cash')
            },
            payment_status: {
                type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
                defaultValue: 'pending'
            },
            qr_code_data: {
                type: Sequelize.TEXT
            },
            qr_code_expiry: {
                type: Sequelize.DATE
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('orders');
    }
};