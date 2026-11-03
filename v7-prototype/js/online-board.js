/* Read-only access to the existing Vulkanschnegge 6.4 Schneggboard.
   Prototype results are stored locally; they are NEVER written to Firestore. */
(function(){
  'use strict';
  const V=window.VS7;
  let loading=null;
  function script(src){return new Promise((resolve,reject)=>{
    const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(new Error('Firebase-Skripte nicht erreichbar'));document.head.appendChild(tag);
  });}
  async function ensureFirebase(){
    if(window.firebase?.firestore)return window.firebase;
    if(!loading)loading=(async()=>{
      await script('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
      await script('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');
      return window.firebase;
    })();
    return loading;
  }
  V.loadLegacyLeaderboard=async()=>{
    const firebase=await ensureFirebase();
    if(!firebase.apps.length)firebase.initializeApp({
      apiKey:'AIzaSyCz_cFJcV3PgS0N9NfwMttDxJ2e7DrHs00',
      authDomain:'vulkanschnegge-online.firebaseapp.com',
      projectId:'vulkanschnegge-online',
      storageBucket:'vulkanschnegge-online.firebasestorage.app',
      messagingSenderId:'891045383199',
      appId:'1:891045383199:web:19a884cd95e75f4629592a'
    });
    const snap=await firebase.firestore().collection('scores').orderBy('score','desc').limit(10).get();
    return snap.docs.map(doc=>{
      const data=doc.data();
      return {name:String(data.name||'?').slice(0,24),score:Number(data.score)||0,character:String(data.character||'unknown')};
    });
  };
})();
