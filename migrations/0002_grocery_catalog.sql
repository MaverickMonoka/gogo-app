-- Live grocery catalogue for GoGo. Seed prices are carried over from the prototype and must be confirmed by the merchant before launch.
CREATE TABLE IF NOT EXISTS gogo_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
  image_url TEXT,
  emoji TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS gogo_products_active_category_idx ON gogo_products(active, category, name);

INSERT OR IGNORE INTO gogo_products(id,sku,name,category,unit,price_cents,emoji) VALUES
(1,'GRO-001','Beef Chuck or Brisket','Meat','per kg',10499,'🥩'),
(2,'GRO-002','Assorted Chicken Flatties','Meat','per kg',5999,'🍗'),
(3,'GRO-003','Your Butcher by SPAR Pork Loin Chops','Meat','per kg',5999,'🥩'),
(4,'GRO-004','Ouma Boerewors','Meat','per kg',10999,'🌭'),
(5,'GRO-005','Danone Danup Multigrain & Yoghurt Blend','Dairy','950 g',2300,'🥛'),
(6,'GRO-006','Sea Harvest Oven Crisp Fish Portions','Frozen','400 g',7999,'🐟'),
(7,'GRO-007','SPAR Frozen Chicken Gizzards','Frozen','1 kg',4299,'🍗'),
(8,'GRO-008','Nestlé Nido 3+ Milk Powder','Baby','900 g',16999,'🍼'),
(9,'GRO-009','Huggies Disposable Nappies','Baby','Jumbo pack',20999,'👶'),
(10,'GRO-010','Savlon Antiseptic Liquid','Personal Care','750 ml',7999,'🧴'),
(11,'GRO-011','Sunlight Dishwashing Liquid','Household','750 ml',3199,'🧽'),
(12,'GRO-012','SPAR Briquettes','Household','4 kg',7999,'🔥'),
(13,'GRO-013','Kellogg''s Corn Flakes','Pantry','1 kg',6999,'🥣'),
(14,'GRO-014','SPAR Large Eggs','Dairy','30s',6999,'🥚'),
(15,'GRO-015','Red Bull Energy Drink','Drinks','250 ml',2200,'🥤'),
(16,'GRO-016','White Star Super Maize Meal','Pantry','10 kg',9999,'🌽');
