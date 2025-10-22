const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Ensure Admin is initialized (index.js does this, but this is safe idempotence)
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = getFirestore();

module.exports = firestore;
