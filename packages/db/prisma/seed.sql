INSERT INTO "User" ("id", "email", "name")
VALUES ('demo_user', 'demo@housing.local', 'Demo User')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "HistoricalMetric" ("id", "source", "metric", "geography", "period", "value", "unit")
VALUES
  ('hm1', 'CSO', 'residential_price_index', 'Dublin', '2024-Q1', 176.2, 'index'),
  ('hm2', 'CSO', 'residential_price_index', 'Cork', '2024-Q1', 163.8, 'index')
ON CONFLICT DO NOTHING;
