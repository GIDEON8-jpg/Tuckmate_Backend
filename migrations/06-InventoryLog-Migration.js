'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('inventory_logs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id'
                }
            },
            quantity_change: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            reason: {
                type: Sequelize.ENUM(
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
                type: Sequelize.INTEGER,
                comment: 'Order ID, Restock ID, etc.'
            },
            notes: {
                type: Sequelize.TEXT
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

        // Add indexes
        await queryInterface.addIndex('inventory_logs', ['product_id']);
        await queryInterface.addIndex('inventory_logs', ['created_at']);
        await queryInterface.addIndex('inventory_logs', ['reason']);
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('inventory_logs');
    }
    };
