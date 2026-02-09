import baseSql from 'mssql';
import msnodesqlv8 from 'mssql/msnodesqlv8';
import type { config as SqlConfig, ConnectionPool } from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const rawServer = process.env.DB_SERVER ?? 'localhost';
const hasInstance = rawServer.includes('\\');
const [host, instanceName] = rawServer.split('\\');
const parsedPort =
  process.env.DB_PORT && process.env.DB_PORT.trim().length > 0
    ? Number.parseInt(process.env.DB_PORT, 10)
    : undefined;
const port = hasInstance ? undefined : parsedPort;

const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
const sql = useWindowsAuth ? msnodesqlv8 : baseSql;
const odbcDriver =
  process.env.DB_ODBC_DRIVER && process.env.DB_ODBC_DRIVER.trim().length > 0
    ? process.env.DB_ODBC_DRIVER
    : 'ODBC Driver 18 for SQL Server';

const sqlConfig: SqlConfig = {
  server: host,
  port,
  user: useWindowsAuth ? undefined : process.env.DB_USER,
  password: useWindowsAuth ? undefined : process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(useWindowsAuth ? { driver: odbcDriver } : {}),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName,
    ...(useWindowsAuth ? { trustedConnection: true } : {}),
  },
};

let pool: ConnectionPool | null = null;
let connected = false;

export const connectDB = async () => {
  try {
    console.log(
      `DB connect: server=${sqlConfig.server}` +
        `${sqlConfig.options?.instanceName ? `\\${sqlConfig.options.instanceName}` : ''}` +
        `${sqlConfig.port ? ` port=${sqlConfig.port}` : ''}` +
        ` db=${sqlConfig.database ?? ''}` +
        ` auth=${useWindowsAuth ? 'windows' : 'sql'}` +
        `${useWindowsAuth ? ` driver=${odbcDriver}` : ''}`
    );
    pool = await new sql.ConnectionPool(sqlConfig).connect();
    connected = true;
    console.log('✓ SQL Server connected successfully');
    return pool;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call connectDB first.');
  }
  return pool;
};

export const disconnectDB = async () => {
  if (pool) {
    await pool.close();
    console.log('✓ Database disconnected');
  }
};

export const isDBConnected = () => connected;

export default sql;
