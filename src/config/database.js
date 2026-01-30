const mongoose = require('mongoose');
const logger = require('../utils/logger');

const dns = require('dns').promises;
const dnsRaw = require('dns');

const buildMongoURI = () => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  if (process.env.MONGODB_SEEDLIST) return process.env.MONGODB_SEEDLIST;

  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASS;
  const hosts = process.env.MONGODB_HOSTS; 

  if (user && pass && hosts) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hosts}/?retryWrites=true&w=majority`;
  }

  return null;
};

const checkSrv = async (host) => {
  try {
    const name = host.replace(/^mongodb\+srv:\/\//, '').split('/')[0];
    const target = name.replace(/^.*@/, '');

    // If user provided DNS servers via env, apply them to c-ares
    if (process.env.MONGODB_DNS_SERVERS) {
      const servers = process.env.MONGODB_DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean);
      if (servers.length) {
        dnsRaw.setServers(servers);
        logger.info(`Using custom DNS servers for SRV resolution: ${servers.join(',')}`);
      }
    }

    const records = await dns.resolveSrv(`_mongodb._tcp.${target}`);
    logger.info(`Resolved SRV records for ${target}: ${JSON.stringify(records)}`);
    return records;
  } catch (err) {
    // Let caller handle logging
    throw err;
  }
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const connectDB = async () => {
  let uri = buildMongoURI();
  if (!uri) {
    logger.error('No MongoDB URI configured. Set MONGODB_URI or MONGODB_USER/MONGODB_PASS/MONGODB_HOSTS in your .env');
    process.exit(1);
  }

  const maxAttempts = 3;
  let switchedDns = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (uri.startsWith('mongodb+srv://')) {
        try {
          // try resolving SRV first for clearer diagnostics
          // eslint-disable-next-line no-await-in-loop
          await checkSrv(uri);
        } catch (srvErr) {
          logger.error(`SRV pre-check failed: ${srvErr.code || srvErr.message}`);
        }
      }

      const conn = await mongoose.connect(uri, { 
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        w: 'majority'
      });
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt} failed:`, error);

      if (error && error.syscall === 'querySrv') {
        logger.error('DNS SRV lookup failed when resolving the MongoDB+SRV host. Possible causes:');
        logger.error('- No internet / DNS issues');
        logger.error('- Corporate firewall or DNS blocking SRV lookups');
        logger.error('- MongoDB Atlas IP access list not allowing your IP');
        logger.error('Suggestions:');
        logger.error('- Ensure your machine can resolve SRV records (try: nslookup -type=SRV _mongodb._tcp.<your-host>)');
        logger.error('- Temporarily allow 0.0.0.0/0 in Atlas Network Access for testing');
        logger.error('- If DNS SRV is blocked, construct a standard `mongodb://` seedlist connection string with explicit hosts from Atlas');

        // Try switching Node's DNS servers (c-ares) to public resolvers once
        if (!switchedDns) {
          try {
            const servers = process.env.MONGODB_DNS_SERVERS
              ? process.env.MONGODB_DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean)
              : ['1.1.1.1', '8.8.8.8'];
            dnsRaw.setServers(servers);
            switchedDns = true;
            logger.info(`Switched DNS servers for Node resolver to: ${servers.join(',')}. Retrying...`);
            // small delay before retry
            // eslint-disable-next-line no-await-in-loop
            await wait(500);
            continue;
          } catch (setErr) {
            logger.error('Failed to switch DNS servers:', setErr);
          }
        }

        // If user provided an explicit seedlist, try it as a fallback immediately
        if (process.env.MONGODB_SEEDLIST && !process.env.MONGODB_URI) {
          logger.info('Attempting fallback to MONGODB_SEEDLIST (non-SRV)');
          // switch uri to seedlist and retry immediately
          // eslint-disable-next-line require-atomic-updates
          uri = process.env.MONGODB_SEEDLIST;
          // eslint-disable-next-line no-await-in-loop
          await wait(500);
          continue;
        }
      }

      if (attempt < maxAttempts) {
        const backoff = attempt * 1000;
        logger.info(`Retrying MongoDB connection in ${backoff}ms...`);
        // small delay before retrying
        // eslint-disable-next-line no-await-in-loop
        await wait(backoff);
        continue;
      }

      logger.error('All MongoDB connection attempts failed. Exiting.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// Auto-reconnect logic
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('close', () => {
  logger.warn('MongoDB connection closed');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;
