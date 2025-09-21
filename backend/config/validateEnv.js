module.exports = function validateEnv() {
  const required = {
    MONGO_URI: 'MongoDB connection string',
    JWT_SECRET: 'JWT signing secret (minimum 32 characters)'
  };

  const production = {
    FRONTEND_URL: 'Frontend URL for CORS configuration',
    NODE_ENV: 'Environment (development/production)'
  };

  const optional = {
    JWT_EXPIRE: 'JWT expiration time (default: 7d)',
    CROSS_SITE_COOKIES: 'Enable cross-site cookies (default: false)'
  };

  // Check required variables
  const missingRequired = Object.keys(required).filter(key => {
    const raw = process.env[key];
    const val = typeof raw === 'string' ? raw.trim() : raw;
    return !val;
  });
  if (missingRequired.length) {
    console.error('❌ Missing required environment variables:');
    missingRequired.forEach(key => {
      console.error(`   ${key}: ${required[key]}`);
    });
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  // Check production-specific variables in production
  if (process.env.NODE_ENV === 'production') {
    const missingProduction = Object.keys(production).filter(key => !process.env[key]);
    if (missingProduction.length) {
      console.warn('⚠️  Missing recommended production variables:');
      missingProduction.forEach(key => {
        console.warn(`   ${key}: ${production[key]}`);
      });
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
  }

  // Validate MONGO_URI format
  if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb')) {
    throw new Error('MONGO_URI must be a valid MongoDB connection string');
  }

  // Normalize and validate PORT; default to 5000 when not provided
  const rawPort = process.env.PORT;
  const portNum = Number(rawPort ?? 5000);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('PORT must be a valid port number (1-65535)');
  }
  // Ensure consistency across the app by setting PORT explicitly as a string
  process.env.PORT = String(portNum);

  // Log configuration summary
  console.log('✅ Environment validation passed');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${portNum}`);
  console.log(`   Database: ${process.env.MONGO_URI.replace(/\/\/[^@]+@/, '//***:***@')}`);
  if (process.env.FRONTEND_URL) {
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL}`);
  }
};
