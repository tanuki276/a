import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Firebaseの環境変数（Vercelなら .env でセット）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("status");
const threadForm = document.getElementById("threadForm");
const threadTitleInput = document.getElementById("threadTitle");
const threadList = document.getElementById("threadList");

const provider = new GoogleAuthProvider();

// ランダムID生成
function generateRandomId(length = 12) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ログイン処理
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("ログイン失敗: " + err.message);
  }
});

// ログアウト処理（例えばstatusクリックでログアウト）
status.addEventListener("click", () => {
  if (auth.currentUser) {
    signOut(auth);
  }
});

// ログイン状態監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    status.textContent = `ようこそ ${user.displayName} さん（クリックでログアウト）`;
    loginBtn.style.display = "none";
    threadForm.style.display = "flex";
    loadThreads();
  } else {
    status.textContent = "ログインしてください";
    loginBtn.style.display = "inline-block";
    threadForm.style.display = "none";
    threadList.innerHTML = "";
  }
});

// スレッド作成
threadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = threadTitleInput.value.trim();
  if (!title) return;

  const user = auth.currentUser;
  if (!user) return alert("ログインしてください");

  const threadId = generateRandomId();
  const threadRef = ref(db, "threads/" + threadId);

  await set(threadRef, {
    title,
    creatorUid: user.uid,
    creatorName: user.displayName,
    createdAt: new Date().toISOString(),
  });

  threadTitleInput.value = "";
});

// スレッド一覧読み込み
function loadThreads() {
  const threadsRef = ref(db, "threads");

  onValue(threadsRef, (snapshot) => {
    threadList.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      threadList.innerHTML = "<li>まだスレッドがありません</li>";
      return;
    }

    for (const [id, thread] of Object.entries(data)) {
      const li = document.createElement("li");
      li.textContent = `${thread.title} （作成者: ${thread.creatorName}）`;
      threadList.appendChild(li);
    }
  });
}