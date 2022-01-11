const Pool = require('pg').Pool;

const pool = new Pool({
   user : 'postgres',
   password : 'silicon',
   host : 'localhost',
   port : '5432',
   database : 'sahayog'
});

module.exports = pool;