// Runs before any test module is evaluated (so config/env reads these).
process.env.NODE_ENV = 'test';
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.AUTH_ALLOW_TEST_TOKENS = 'true';
process.env.AUTH_TEST_TOKEN_SECRET = 'test-secret';
process.env.FEATURE_ADVANCED_ANALYTICS = 'true';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/fluxberry_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.INBOUND_EMAIL_SECRET = 'test-inbound-secret';
process.env.INBOUND_EMAIL_DOMAIN = 'reply.test.fluxberry.dev';
