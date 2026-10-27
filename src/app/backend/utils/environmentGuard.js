'use strict';

/**
 * Multi-Layered Environment Guard
 * Default-deny security design to prevent destructive database operations.
 */

exports.isDisposableDatabase = () => {
  // 1. Explicit production/staging block
  const env = (process.env.NODE_ENV || 'production').toLowerCase();
  if (env === 'production' || env === 'staging') {
    return { isDisposable: false, reason: `Environment is set to '${env}'` };
  }

  // 2. Require mandatory non-production authorization flags
  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    return { isDisposable: false, reason: 'ALLOW_DATABASE_RESET environment variable is not explicitly enabled' };
  }

  if (process.env.IS_DISPOSABLE_TEST_DB !== 'true') {
    return { isDisposable: false, reason: 'IS_DISPOSABLE_TEST_DB flag is missing (only explicitly declared disposable test DBs can be reset)' };
  }

  // 3. Database URL and Host Verification
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  const dbHost = (process.env.DB_HOST || '').toLowerCase();

  // Deny any cloud, institutional, or remote database host
  const prohibitedHostSignatures = [
    'render.com', 'onrender.com', 'aws.com', 'amazonaws.com', 'rds',
    'supabase.co', 'railway.app', 'heroku', 'cockroach', 'neon.tech',
    'christuniversity.in'
  ];

  for (const sig of prohibitedHostSignatures) {
    if (dbUrl.includes(sig) || dbHost.includes(sig)) {
      return { isDisposable: false, reason: `Remote or cloud database host signature detected: ${sig}` };
    }
  }

  // 4. Must be explicitly local host
  const isLocalHost = 
    dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1' ||
    dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  if (!isLocalHost && (dbHost || dbUrl)) {
    return { isDisposable: false, reason: 'Database is not running on a verified local loopback interface (localhost / 127.0.0.1)' };
  }

  return { isDisposable: true };
};

/**
 * Asserts that the database environment is disposable, throwing an error otherwise.
 */
exports.assertDisposableDatabase = (customConfig = null, customEnv = null) => {
  const env = customEnv || process.env;
  const config = customConfig || {
    databaseUrl: env.DATABASE_URL || '',
    dbHost: env.DB_HOST || ''
  };

  const nodeEnv = (env.NODE_ENV || 'production').toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    throw new Error(`System database reset is strictly forbidden in '${nodeEnv}' environments.`);
  }

  if (env.ALLOW_DATABASE_RESET !== 'true') {
    throw new Error('ALLOW_DATABASE_RESET=true environment flag is required for database reset.');
  }

  if (env.IS_DISPOSABLE_TEST_DB !== 'true') {
    throw new Error('IS_DISPOSABLE_TEST_DB=true is required. Only explicitly declared disposable databases can be wiped.');
  }

  const url = (config.databaseUrl || '').toLowerCase();
  const host = (config.dbHost || '').toLowerCase();

  const prohibited = [
    'render.com', 'onrender.com', 'aws.com', 'amazonaws.com', 'rds',
    'supabase.co', 'railway.app', 'heroku', 'cockroach', 'neon.tech',
    'christuniversity.in'
  ];

  for (const sig of prohibited) {
    if (url.includes(sig) || host.includes(sig)) {
      throw new Error(`Refusing to wipe remote or shared database (${sig}).`);
    }
  }

  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' || url.includes('localhost') || url.includes('127.0.0.1');
  if (!isLocalHost && (host || url)) {
    throw new Error('Refusing to wipe database: host is not a verified local loopback address.');
  }

  return true;
};
