const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',

  logging:
    process.env.NODE_ENV === 'development'
      ? console.log
      : false,

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },

  pool: {
    max: process.env.VERCEL === '1' ? 1 : 5,
    min: 0,
    acquire: 10000,
    idle: 10000,
  },
});

/**
 * Add a column only when it is missing. sync() is create-only, so model changes
 * never reach an existing table without this.
 */
async function ensureColumn(table, column, definition) {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const description = await queryInterface.describeTable(table);
    if (description[column]) return;
    await queryInterface.addColumn(table, column, definition);
    console.log(`ensureColumn: added ${table}.${column}`);
  } catch (error) {
    console.error(`ensureColumn failed for ${table}.${column}:`, error.message);
  }
}

async function ensureSchema() {
  await ensureColumn('Users', 'isEmailVerified', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });
  await ensureColumn('Users', 'emailVerificationToken', { type: DataTypes.STRING, allowNull: true });
  await ensureColumn('Users', 'emailVerificationExpires', { type: DataTypes.DATE, allowNull: true });
  await ensureColumn('Users', 'googleId', { type: DataTypes.STRING, allowNull: true });
}

async function connectDB() {
  try {
    await sequelize.authenticate();

    console.log('PostgreSQL database connection established successfully.');

    await sequelize.sync();
    await ensureSchema();

    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  connectDB,
};