INSERT INTO "User" ("id", "email", "name")
VALUES ('demo_user', 'demo@housing.local', 'Demo User')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "HistoricalMetric" ("id", "source", "metric", "geography", "period", "value", "unit")
VALUES
  ('hm1', 'CSO_HPM06', 'RPPI', 'Dublin', '2024-Q1', 176.2, 'index_2015_100'),
  ('hm2', 'CSO_HPM06', 'RPPI', 'Cork', '2024-Q1', 163.8, 'index_2015_100')
ON CONFLICT DO NOTHING;
