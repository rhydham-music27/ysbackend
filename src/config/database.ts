import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', false);

const DEFAULT_MAX_RETRIES = 5;
const BASE_DELAY_MS = 5000; // 5 seconds

async function connectDB(maxRetries: number = DEFAULT_MAX_RETRIES): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;

  if (!mongoUri) {
    // eslint-disable-next-line no-console
    console.error('❌ MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);

      const { host, name } = mongoose.connection;
      // eslint-disable-next-line no-console
      console.log(`✅ MongoDB connected: host=${host} db=${name}`);
      return;
    } catch (error) {
      attempt += 1;
      // eslint-disable-next-line no-console
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        // eslint-disable-next-line no-console
        console.error('❌ All MongoDB connection attempts failed. Exiting process.');
        process.exit(1);
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function disconnectDB(): Promise<void> {
  try {
    await mongoose.connection.close();
    // eslint-disable-next-line no-console
    console.log('🔌 MongoDB connection closed.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error during MongoDB disconnect:', error);
  }
}

export { disconnectDB };
export default connectDB;


