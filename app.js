// Firebase SDKの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, setDoc, doc, getDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBIY3DFsKw2L0LB6MBLR_0f1NXOppCDta8",
  authDomain: "anitb-63dcb.firebaseapp.com",
  projectId: "anitb-63dcb",
  storageBucket: "anitb-63dcb.appspot.com",
  messagingSenderId: "196706725748",
  appId: "1:196706725748:web:85c67f85aec5e0fea9c621",
  measurementId: "G-13Z9ZVCTCJ"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM要素
const loginBtn = document.getElementById("loginBtn");
const statusDiv = document.getElementById("status");
const threadForm = document.getElementById("threadForm");
const threadTitleInput = document.getElementById("threadTitle");
const threadList = document.getElementById("threadList");

// ニックネーム取得
async function getNickname(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().nickname;
  } else {
    const nickname = prompt("ニックネームを入力してください");
    if (nickname) {
      await setDoc(docRef, { nickname });
      return nickname;
    } else {
      return "名無し";
    }
  }
}

// スレッドの取得
async function loadThreads() {
  threadList.innerHTML = "";
  const q = query(collection(db, "threads"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = `[${data.author}] ${data.title}`;
    threadList.appendChild(li);
  });
}

// ログイン状態の監視
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const nickname = await getNickname(user.uid);
    statusDiv.textContent = `ログイン中: ${nickname}`;
    threadForm.style.display = "flex";
    loginBtn.style.display = "none";
    loadThreads();
  } else {
    statusDiv.textContent = "ログインしてください";
    threadForm.style.display = "none";
    loginBtn.style.display = "block";
    threadList.innerHTML = "";
  }
});

// ログイン処理
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("ログイン失敗: " + error.message);
  }
});

// ステータスクリックでログアウト
statusDiv.addEventListener("click", () => {
  signOut(auth);
});

// スレッド投稿処理
threadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const nickname = await getNickname(user.uid);
  const title = threadTitleInput.value.trim();
  if (title === "") return;

  await addDoc(collection(db, "threads"), {
    title,
    author: nickname,
    createdAt: serverTimestamp(),
  });

  threadTitleInput.value = "";
  loadThreads();
});