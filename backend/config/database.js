const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const dialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();

let sequelize;

if (dialect === 'sqlite') {
  const storageDir = process.env.DB_STORAGE || './data';
  const storageFile = process.env.DB_FILE || 'education-platform.sqlite';
  const storagePath = path.resolve(process.cwd(), storageDir, storageFile);

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: require('sqlite3'),
    storage: storagePath,
    // SQLite cannot ALTER a table that other tables reference with foreign
    // keys (alter rebuilds tables). Leave runtime enforcement off so dev
    // schema sync ({ alter: true }) can rebuild tables; integrity is guarded
    // by the app layer + model constraints.
    foreignKeys: false,
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'education_platform',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

/**
 * Test database connection
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();

    if (dialect === 'sqlite') {
      console.log(`SQLite Connected: ${path.resolve(process.cwd(), process.env.DB_STORAGE || './data', process.env.DB_FILE || 'education-platform.sqlite')}`);
    } else {
      console.log(`MySQL Connected: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    }

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized');
    }
  } catch (error) {
    console.error(`Database connection failed (${dialect}): ${error.message}`);
    console.error(error.original || error.parent || error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await sequelize.close();
  console.log(`${dialect === 'sqlite' ? 'SQLite' : 'MySQL'} connection closed through app termination`);
  process.exit(0);
});

module.exports = { sequelize, connectDB };
