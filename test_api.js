const fetch = require('node-fetch');

async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/crypto/news');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

testApi();
