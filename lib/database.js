const {Pool}=require('pg');
let pool;
function database(){if(!process.env.DATABASE_URL)throw new Error('Database is not configured');if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:8000});return pool}
module.exports={database};
