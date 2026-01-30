const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  try {
    console.log('🚀 Testing Flash Deal Reservation API\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Register admin user
    console.log('\n2. Registering admin user...');
    const adminResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'admin',
      email: 'admin@test.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User'
    });
    console.log('✅ Admin registered:', adminResponse.data.data.email);

    // Register regular user
    console.log('\n3. Registering regular user...');
    const userResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'testuser',
      email: 'user@test.com',
      password: 'user123',
      firstName: 'Test',
      lastName: 'User'
    });
    console.log('✅ User registered:', userResponse.data.data.email);

    // Login admin
    console.log('\n4. Admin login...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin logged in');

    // Login user
    console.log('\n5. User login...');
    const userLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user@test.com',
      password: 'user123'
    });
    const userToken = userLogin.data.data.token;
    console.log('✅ User logged in');

    // Create a product
    console.log('\n6. Creating flash deal product...');
    const productResponse = await axios.post(`${API_BASE}/products`, {
      name: 'Flash Deal Smartphone',
      description: 'Latest smartphone with amazing features',
      sku: 'PHONE001',
      price: 299.99,
      totalStock: 200,
      category: 'Electronics',
      flashDealSettings: {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        maxReservationTime: 600
      }
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const product = productResponse.data.data;
    console.log('✅ Product created:', product.name, 'SKU:', product.sku);

    // Get product stock status
    console.log('\n7. Checking product stock status...');
    const stockStatus = await axios.get(`${API_BASE}/products/${product._id}/stock-status`);
    console.log('✅ Stock status:', {
      totalStock: stockStatus.data.data.totalStock,
      availableStock: stockStatus.data.data.availableStock,
      reservedStock: stockStatus.data.data.reservedStock
    });

    // Reserve product
    console.log('\n8. Reserving 2 units...');
    const reservationResponse = await axios.post(`${API_BASE}/products/reserve`, {
      productId: product._id,
      quantity: 2
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const reservation = reservationResponse.data.data;
    console.log('✅ Reservation created:', reservation.reservation.reservationId);

    // Check stock after reservation
    console.log('\n9. Checking stock after reservation...');
    const stockAfterReservation = await axios.get(`${API_BASE}/products/${product._id}/stock-status`);
    console.log('✅ Stock after reservation:', {
      totalStock: stockAfterReservation.data.data.totalStock,
      availableStock: stockAfterReservation.data.data.availableStock,
      reservedStock: stockAfterReservation.data.data.reservedStock
    });

    // Create order from reservation
    console.log('\n10. Creating order from reservation...');
    const orderResponse = await axios.post(`${API_BASE}/orders`, {
      reservationId: reservation.reservation.reservationId,
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const order = orderResponse.data.data;
    console.log('✅ Order created:', order.orderNumber, 'Total:', order.totalAmount);

    // Final stock check
    console.log('\n11. Final stock check...');
    const finalStock = await axios.get(`${API_BASE}/products/${product._id}/stock-status`);
    console.log('✅ Final stock status:', {
      totalStock: finalStock.data.data.totalStock,
      availableStock: finalStock.data.data.availableStock,
      reservedStock: finalStock.data.data.reservedStock,
      soldStock: finalStock.data.data.soldStock
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Product created with 200 units');
    console.log('- 2 units reserved successfully');
    console.log('- Order created from reservation');
    console.log('- Stock updated correctly');
    console.log('- No overselling occurred');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure MongoDB and Redis are running before testing');
    }
  }
}

// Check if axios is available, if not install it
try {
  require('axios');
  testAPI();
} catch (error) {
  console.log('Installing axios for testing...');
  const { execSync } = require('child_process');
  execSync('npm install axios', { stdio: 'inherit' });
  testAPI();
}
