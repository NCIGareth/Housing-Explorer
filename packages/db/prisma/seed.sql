INSERT INTO "User" ("id", "email", "name", "password")
VALUES ('demo_user', 'demo@housing.local', 'Demo User', '$2b$12$/FnyAfC1FGsxoZok2Wm5WOQ4tPW8.ZijHyXOo3X8q0MgrY7y3ocIS')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "HistoricalMetric" ("id", "source", "metric", "geography", "period", "value", "unit")
VALUES
  ('hm1', 'CSO', 'residential_price_index', 'Dublin', '2024-Q1', 176.2, 'index'),
  ('hm2', 'CSO', 'residential_price_index', 'Cork', '2024-Q1', 163.8, 'index')
ON CONFLICT DO NOTHING;
