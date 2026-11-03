-- Sample products so the store isn't empty. Edit prices/titles or delete freely.
-- Run after schema.sql. Covers are generated automatically until you upload images in /admin/products.
insert into public.products (slug, title, description, category, platforms, price, compare_at_price, is_featured)
values
  ('spider-man-2', 'Marvel''s Spider-Man 2', 'Swing through an expanded New York as Peter and Miles. Delivered straight to your own PSN account.', 'playstation-games', '{PS5}', 2799, 4999, true),
  ('god-of-war-ragnarok', 'God of War Ragnarök', 'Kratos and Atreus journey through the Nine Realms. Delivered to your own PSN account.', 'playstation-games', '{PS5,PS4}', 2299, 3999, true),
  ('gta-v', 'Grand Theft Auto V', 'Story mode plus GTA Online. Delivered to your own PSN account.', 'playstation-games', '{PS5,PS4}', 1199, 2499, true),
  ('ea-fc-26', 'EA SPORTS FC 26', 'The latest football season with Ultimate Team. Delivered to your own PSN account.', 'playstation-games', '{PS5,PS4}', 2999, 4999, true),
  ('elden-ring', 'Elden Ring', 'The award-winning open-world action RPG. Delivered to your own PSN account.', 'playstation-games', '{PS5,PS4}', 1899, 3499, true),
  ('ghost-of-tsushima-dc', 'Ghost of Tsushima Director''s Cut', 'Includes the Iki Island expansion. Delivered to your own PSN account.', 'playstation-games', '{PS5}', 2199, 3999, false),
  ('red-dead-redemption-2', 'Red Dead Redemption 2', 'Outlaws, the frontier and a vast open world. Delivered to your own PSN account.', 'playstation-games', '{PS4}', 999, 2499, false),
  ('gran-turismo-7', 'Gran Turismo 7', 'The real driving simulator. Delivered to your own PSN account.', 'playstation-games', '{PS5,PS4}', 1999, 3999, false),
  ('cyberpunk-2077-pc', 'Cyberpunk 2077', 'Night City awaits. Steam activation.', 'pc-games', '{PC}', 1299, 2999, true),
  ('black-myth-wukong-pc', 'Black Myth: Wukong', 'Action RPG rooted in Chinese mythology. Steam activation.', 'pc-games', '{PC}', 2199, 2999, true),
  ('ps-plus-essential-12m', 'PS Plus Essential — 12 Months', 'Online multiplayer, monthly games and cloud saves.', 'playstation-plus', '{PS5,PS4}', 2999, 3999, true),
  ('ps-plus-deluxe-12m', 'PS Plus Deluxe — 12 Months', 'Everything in Extra plus Classics and game trials.', 'playstation-plus', '{PS5,PS4}', 5999, 7999, true)
on conflict (slug) do nothing;
