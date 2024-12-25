import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.HOST,
  port: process.env.DBPORT,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,
});

export default pool;
