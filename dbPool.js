// connection to MercuryStore database
// SQL Table Names: cart, category, product, seller
const mysql = require("mysql");

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "i0rgccmrx3at3wv3.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "mbwz8iqhqup6dva5",
  password: "ah2n4fht8ibphcil",
  database: "j0i18ujirjqzgbdx"
});

module.exports = pool;
