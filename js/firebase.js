
  // Deine Konfiguration
  const firebaseConfig = {
    apiKey: "AIzaSyCz_cFJcV3PgS0N9NfwMttDxJ2e7DrHs00",
    authDomain: "vulkanschnegge-online.firebaseapp.com",
    projectId: "vulkanschnegge-online",
    storageBucket: "vulkanschnegge-online.firebasestorage.app",
    messagingSenderId: "891045383199",
    appId: "1:891045383199:web:19a884cd95e75f4629592a"
  };
  // Init
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  applyBestMessage();
