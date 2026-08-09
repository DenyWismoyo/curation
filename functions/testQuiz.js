const admin = require('firebase-admin');
const { getFunctions } = require('firebase-admin/functions');

admin.initializeApp({ projectId: 'teknopark-surakarta' });

// We cannot use firebase-admin/functions to call a function directly easily from admin SDK.
// It's better to use fetch to make an HTTP request to the cloud function.

const fetch = require('node-fetch'); // we can use node's fetch if Node >= 18, but firebase tools uses 22, so fetch is native!

async function testCall() {
  const url = 'http://127.0.0.1:5001/teknopark-surakarta/asia-southeast2/generateCryptoModuleAssessment';
  // Wait, if it's deployed, we call the live URL.
  const liveUrl = 'https://asia-southeast2-teknopark-surakarta.cloudfunctions.net/generateCryptoModuleAssessment';
  
  const data = {
    data: {
      moduleId: 'hMzeNzy82bfAtpbrT38R' // From our earlier tests
    }
  };

  try {
    const res = await fetch(liveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch(e) {
    console.error(e);
  }
}

testCall();
