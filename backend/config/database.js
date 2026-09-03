const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

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
  // Serverless platforms (e.g. Vercel) spin up many short-lived instances.
  // A large per-instance pool exhausts the provider's connection limit (TiDB
  // Serverless free tier caps sockets), so keep the pool small there. A
  // traditional always-on host (EC2, Railway, a VPS) can afford a bigger pool.
  const serverless = process.env.VERCEL === '1' || process.env.SERVERLESS === '1';
  const poolSize = serverless ? Math.max(1, parseInt(process.env.DB_POOL_MAX) || 1) : 5;

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
        max: poolSize,
        min: 0,
        // Serverless cold starts are slow and the pool is tiny; don't hold a
        // connection while waiting for a spot.
        acquire: serverless ? 10000 : 30000,
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

    // Plain `sync()` only creates missing tables (CREATE TABLE IF NOT EXISTS);
    // it never alters or drops existing ones. Running it in every environment is
    // therefore safe and idempotent, and it guarantees a fresh hosted DB gets
    // its schema on first boot. The dev-only extra handles SQLite leftovers.
    //
    // SQLite has no real ALTER: sync({ alter: true }) recreates tables for any
    // detected column diff, and Sequelize's DEFAULT string/number normalization
    // never converges, so altered tables are rebuilt on every boot. Each
    // interrupted rebuild leaves a populated `*_backup` table that crashes the
    // next boot (UNIQUE constraint). We use create-only sync only, and clean
    // leftover backup tables on dev.
    if (dialect === 'sqlite' && process.env.NODE_ENV === 'development') {
      const [backupTables] = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup%'"
      );
      for (const row of backupTables) {
        const escaped = String(row.name).replace(/"/g, '""');
        await sequelize.query(`DROP TABLE IF EXISTS "${escaped}"`);
      }
    }
    await sequelize.sync();

    // Column migrations (create-only sync won't alter existing tables).
    const queryInterface = sequelize.getQueryInterface();

    const ensureColumn = async (table, column, columnDef) => {
      try {
        const tableInfo = await queryInterface.describeTable(table);
        if (tableInfo && !tableInfo[column]) {
          await queryInterface.addColumn(table, column, columnDef);
        }
      } catch (err) {
        // Table may not exist yet; sync() will have created it with the column.
        if (!/no such table|ER_NO_SUCH_TABLE/i.test(err.message)) throw err;
      }
    };

    await ensureColumn('Quizzes', 'type', {
      type: DataTypes.ENUM('quiz', 'test', 'exam'),
      allowNull: false,
      defaultValue: 'quiz'
    });

    await ensureColumn('ActivityLogs', 'timeSpent', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    console.log('Database synchronized');
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
