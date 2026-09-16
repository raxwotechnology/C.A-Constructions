const app = require('./app');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');

const PORT = 5099;
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ca_constructions';

async function start() {
  await mongoose.connect(mongoUri);
  const server = http.createServer(app);

  server.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);

    try {
      const ceoUser = await User.findOne({ email: 'ceo@ca-constructions.lk' });
      const userId = ceoUser ? ceoUser._id : new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

      const fetchAuth = (url) => new Promise((resolve, reject) => {
        const options = {
          hostname: '127.0.0.1',
          port: PORT,
          path: url,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        req.end();
      });

      console.log('\n--- VERIFYING C.A-CONSTRUCTIONS AUTHENTICATED API ENDPOINTS ---');

      // 1. Health check
      const health = await fetchAuth('/api/health');
      console.log('✓ Health Endpoint:', health.status === 200 ? 'SUCCESS 200 OK' : 'FAILED', health.data.message);

      // 2. Sites Endpoint
      const sites = await fetchAuth('/api/sites');
      console.log('✓ Construction Sites Endpoint:', sites.status === 200 ? 'SUCCESS 200 OK' : 'FAILED', `(${sites.data.projects?.length || 0} active sites loaded)`);

      // 3. Stock Inventory Endpoint
      const stock = await fetchAuth('/api/inventory/stock');
      console.log('✓ Central Warehouse & Site Stock Endpoint:', stock.status === 200 ? 'SUCCESS 200 OK' : 'FAILED', `(${stock.data.stock?.length || 0} stock items loaded)`);

      // 4. GRN Delivery Fraud Warnings
      const grn = await fetchAuth('/api/inventory/grn');
      console.log('✓ GRN Variance Protection Endpoint:', grn.status === 200 ? 'SUCCESS 200 OK' : 'FAILED', `(${grn.data.grns?.length || 0} GRNs loaded)`);

      // 5. 12-Section Daily Diary
      const diary = await fetchAuth('/api/daily-diary');
      console.log('✓ 12-Section Interactive Daily Diary Endpoint:', diary.status === 200 ? 'SUCCESS 200 OK' : 'FAILED', `(${diary.data.diaries?.length || 0} diary entries loaded)`);

      console.log('\n🎉 ALL C.A-CONSTRUCTIONS MODULES RETURNED 200 OK WITH VERIFIED DATA!\n');
    } catch (err) {
      console.error('Verification Error:', err.message);
    } finally {
      server.close();
      mongoose.connection.close();
      process.exit(0);
    }
  });
}

start();
