//index.js
const express = require("express");
const app = express();
const fetch = require("node-fetch");
const pool = require("./dbPool.js");
const bodyParser = require("body-parser");

let transactions = 0;

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/checkout", async (req, res) => {
  let sql =
    "SELECT cart.*, product.productname, product.imgUrl FROM cart JOIN product ON cart.productid = product.productid";
  let rows = await executeSQL(sql);
  res.render("checkout", { items: rows });
});

app.get("/confirm", (req, res) => {
  res.render("ship", { city: "", state: "" });
});

// Function to get state and city from zip
app.get("/getShipInfo", async (req, res) => {
  let zip = req.query.zip;
  let url = `https://csumb.space/api/cityInfoAPI.php?zip=${zip}`;
  let response = await fetch(url);
  let data = await response.json();
  console.log(data.city);
  console.log(data.state);
  res.render("ship", { city: data.city, state: data.state });
});

app.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.search;

    let sql;
    if (searchTerm) {
      sql = `SELECT * FROM product WHERE productname LIKE '%${searchTerm}%'`;
    } else {
      sql = "SELECT * FROM product";
    }

    let rows = await executeSQL(sql);

    res.render("search", { results: rows, searchTerm });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/cart", async (req, res) => {
  try {
    let sql =
      "SELECT * FROM cart JOIN product ON cart.productid = product.productid";
    let items = await executeSQL(sql);

    res.render("cart", { items });
  } catch (error) {
    console.error("Error loading user's cart:", error);
    res.status(500).send("Internal Server Error");
  }
});

// route to newItem view
app.get("/addNewItem", (req, res) => {
  res.render("newItem");
});

// submit data from newItem to database
app.post("/addNewItem", async function (req, res) {
  let nproductid = Math.floor(Math.random() * 100);
  let nproductname = req.body.nproductname;
  let nproductprice = req.body.nproductprice;
  let nsellerid = req.body.nsellerid;
  let ncategoryid = req.body.ncategoryid;
  let sql =
    "INSERT INTO product (productid, productname, productprice, sellerid, categoryid) VALUES (?, ?, ?, ?, ?);";
  let params = [
    nproductid,
    nproductname,
    nproductprice,
    nsellerid,
    ncategoryid,
  ];
  let rows = await executeSQL(sql, params);
  res.render("newItem", { message: "New item added successfully." });
});

app.post("/addToCart", async (req, res) => {
  try {
    const { productid, quantity } = req.body;

    if (
      !productid ||
      !quantity ||
      isNaN(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return res.status(400).send("Invalid productid or quantity.");
    }

    const productQuery = "SELECT * FROM product WHERE productid = ?";
    const productRows = await executeSQL(productQuery, [productid]);

    if (productRows.length === 0) {
      return res.status(404).send("Product not found.");
    }

    const product = productRows[0];
    const subtotal = parseFloat(product.productprice) * parseInt(quantity);

    // ES:Temp removing cart id logic because it auto incs for each product added, since we're deleting the entire cart we can hard code the id

    // const cartidQuery = "SELECT MAX(cartid) AS maxCartId FROM cart";
    // const cartidRows = await executeSQL(cartidQuery);

    // let newCartId;
    // if (cartidRows[0].maxCartId) {
    //   const maxCartId = cartidRows[0].maxCartId;
    //   const numericPart = parseInt(maxCartId.substring(1), 36) + 1;
    //   newCartId = "C" + numericPart.toString(36).toUpperCase().padStart(7, "0");
    // } else {
    //   newCartId = "C0000000";
    // }

    let cartId = "C1";

    const addToCartQuery =
      "INSERT INTO cart (cartid, productid, quantity, subtotal) VALUES (?, ?, ?, ?)";
    await executeSQL(addToCartQuery, [cartId, productid, quantity, subtotal]);

    res.redirect("/search");
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/confirmPurchase", async (req, res) => {
  let url = `https://api.api-ninjas.com/v1/passwordgenerator?length=16`;
  let response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Api-Key": "0Tx+by1kDZv/xqG0g3NmuQ==5niKjkXpjnAjrWfj",
    },
  });

  let data = await response.json();
  console.log(data);
  let conf = data.random_password;
  console.log("Conf is: ", conf);

  // Increment Number of transactions
  transactions++;
  // localStorage.setItem("transactions", transactions);
  // let t = localStorage.getItem("transactions");

  // Send users to page with confirmation number
  res.render("confirmation", { conf, t: transactions });
});

app.post("/confirmPurchase", async (req, res) => {
  try {
    const cartId = "C1";
    console.log("Current Cart ID:", cartId);

    if (!cartId) {
      console.log("Cart ID is undefined.");
      res.status(400).send("Invalid cart ID.");
      return;
    }

    // Clear the current user's cart
    let clearCartQuery = "DELETE FROM cart WHERE cartid = ?";
    await executeSQL(clearCartQuery, cartId);

    // Send users to page with confirmation number
    res.render("confirmation");
  } catch (error) {
    console.error("Error confirming purchase:", error);

    console.error(error);

    res.status(500).send("Internal Server Error: " + error.message);
  }
});

// async function generateNewCartId() {
//   const cartidQuery = "SELECT MAX(cartid) AS maxCartId FROM cart";
//   const cartidRows = await executeSQL(cartidQuery);

//   let newCartId;
//   if (cartidRows[0].maxCartId) {
//     const maxCartId = cartidRows[0].maxCartId;
//     const numericPart = parseInt(maxCartId.substring(1), 36) + 1;
//     newCartId = "C" + numericPart.toString(36).toUpperCase().padStart(7, "0");
//   } else {
//     newCartId = "C0000000";
//   }
//   console.log("New Cart ID generated:", newCartId);

//   return newCartId;
// }

app.listen(3000, () => {
  console.log("server started");
});

app.get("/dbTest", async function (req, res) {
  let sql = "SELECT * FROM product";
  let rows = await executeSQL(sql);
  res.send(rows);
});

async function executeSQL(sql, params) {
  return new Promise(function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}
