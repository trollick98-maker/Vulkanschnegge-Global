
async function applyBestMessage(){
  try{
    const snap = await db.collection('scores')
      .orderBy('score', 'desc')
      .limit(1)
      .get();

    if(!snap.empty){
      const data = snap.docs[0].data();
      const msg = data.bestMessage;
      if(msg && msg.trim() !== ""){
        document.querySelector("#titleBar h2").innerText = msg;
      } else {
        document.querySelector("#titleBar h2").innerText = "Reach for the Stars";
      }
    }
  }catch(e){
    console.warn("applyBestMessage failed:", e);
  }
}
