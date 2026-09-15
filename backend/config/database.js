const { Sequelize } = require('sequelize');

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

async function connectDB() {
  try {
    await sequelize.authenticate();

    console.log('PostgreSQL database connection established successfully.');

    await sequelize.sync();

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