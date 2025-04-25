const { Sequelize } = require('sequelize');
const config = require('./config');

// Determine if using SQLite or MySQL based on config
const isSQLite = config.db?.dialect === 'sqlite';

// Create Sequelize instance with appropriate configuration
let sequelizeConfig;

if (isSQLite) {
    sequelizeConfig = {
        dialect: 'sqlite',
        storage: config.db?.storage || './database.sqlite',
        logging: config.env === 'development' ? console.log : false
    };
} else {
    // MySQL or other SQL database configuration
    sequelizeConfig = {
        host: config.db?.host || 'localhost',
        dialect: 'mysql', // Explicitly set dialect
        port: config.db?.port || 3306,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: config.env === 'development' ? console.log : false
    };
}

const sequelize = isSQLite
    ? new Sequelize(sequelizeConfig)
    : new Sequelize(
        config.db?.name || 'tuckmate_db',
        config.db?.user || 'root',
        config.db?.password || '',
        sequelizeConfig
    );

// Remove automatic connection attempt for CLI usage
// We'll only connect when the application runs, not during migrations

// Sequelize doesn't have beforeDisconnect in current versions
// This section should be removed
/*
sequelize.beforeDisconnect((connection) => {
    console.log('Database connection lost. Attempting to reconnect...');
    connectWithRetry(3, 3000);
});
*/

// Only handle graceful shutdown in application code, not during CLI operations
if (process.env.NODE_ENV !== 'sequelize-cli') {
    // Improved connection handling with reconnection strategy
    const connectWithRetry = async (maxRetries = 5, delay = 5000) => {
        let retries = 0;

        while (retries < maxRetries) {
            try {
                await sequelize.authenticate();
                console.log('Database connection established successfully.');
                return true;
            } catch (err) {
                retries++;
                console.error(`Unable to connect to the database (attempt ${retries}/${maxRetries}):`, err);

                if (retries >= maxRetries) {
                    console.error('Maximum connection attempts reached. Exiting...');
                    return false;
                }

                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    // Only initialize connection when running the application, not during migrations
    connectWithRetry()
        .catch(err => {
            console.error('Fatal database connection error:', err);
            process.exit(1); // Exit application on fatal error
        });

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
        try {
            await sequelize.close();
            console.log('Database connection closed gracefully.');
            process.exit(0);
        } catch (err) {
            console.error('Error during database disconnection:', err);
            process.exit(1);
        }
    });
}

module.exports = sequelize;