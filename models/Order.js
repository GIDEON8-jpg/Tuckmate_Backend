module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('ecocash', 'cash')
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    qr_code_data: {
      type: DataTypes.TEXT
    },
    qr_code_expiry: {
      type: DataTypes.DATE
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'orders'
  });

  return Order;
};
