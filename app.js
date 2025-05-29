import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBIY3DFsKw2L0LB6MBLR_0f1NXOppCDta8",
  authDomain: "anitb-63dcb.firebaseapp.com",
  databaseURL: "https://anitb-63dcb-default-rtdb.firebaseio.com",
  projectId: "anitb-63dcb",
  storageBucket: "anitb-63dcb.appspot.com",
  messagingSenderId: "196706725748",
  appId: "1:196706725748:web:85c67f85aec5e0fea9c621",
  measurementId: "G-13Z9ZVCTCJ"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM要素
const threadListEl = document.getElementById("threadList");
const searchThreadEl = document.getElementById("searchThread");
const threadTitleEl = document.getElementById("threadTitle");
const createThreadBtn = document.getElementById("createThreadBtn");

const commentSection = document.getElementById("commentSection");
const threadSection = document.getElementById("threadSection");
const currentThreadTitleEl = document.getElementById("currentThreadTitle");
const commentTextEl = document.getElementById("commentText");
const postCommentBtn = document.getElementById("postCommentBtn");
const backToThreadsBtn = document.getElementById("backToThreadsBtn");
const commentListEl = document.getElementById("commentList");

let currentThreadId = null;
let allThreads = [];

// ローカルストレージで投稿制限
function canDoAction(key, intervalMs) {
  const last = localStorage.getItem(key);
  const now = Date.now();
  if (!last || now - last >= intervalMs) {
    localStorage.setItem(key, now);
    return true;
  }
  return false;
}

// スレッド一覧取得・表示
async function loadThreads(filter = "") {
  threadListEl.innerHTML = "";
  const q = query(collection(db, "threads"), orderBy("created", "desc"));
  const snapshot = await getDocs(q);

  allThreads = [];
  snapshot.forEach(doc => {
    allThreads.push({ id: doc.id, title: doc.data().title });
  });

  // フィルターで絞り込み
  const filtered = allThreads.filter(t =>
    t.title.toLowerCase().includes(filter.toLowerCase())
  );

  if(filtered.length === 0){
    threadListEl.innerHTML = "<li>該当スレがありません</li>";
    return;
  }

  filtered.forEach(thread => {
    const li = document.createElement("li");
    li.textContent = thread.title;
    li.dataset.id = thread.id;
    li.addEventListener("click", () => openThread(thread.id, thread.title));
    threadListEl.appendChild(li);
  });
}

// スレ立て処理
createThreadBtn.addEventListener("click", async () => {
  if (!canDoAction("lastThread", 3600000)) {
    alert("スレ立ては1時間に1回までです！");
    return;
  }
  const title = threadTitleEl.value.trim();
  if (title === "") {
    alert("タイトルを入力してください");
    return;
  }
  await addDoc(collection(db, "threads"), {
    title,
    created: serverTimestamp(),
  });
  threadTitleEl.value = "";
  alert("スレ立て成功！");
  loadThreads();
});

// スレ検索
searchThreadEl.addEventListener("input", e => {
  loadThreads(e.target.value);
});

// スレ開く（コメント表示）
async function openThread(threadId, threadTitle) {
  currentThreadId = threadId;
  currentThreadTitleEl.textContent = threadTitle;
  threadSection.style.display = "none";
  commentSection.style.display = "block";
  commentTextEl.value = "";
  await loadComments(threadId);
}

// コメント一覧取得・表示
async function loadComments(threadId) {
  commentListEl.innerHTML = "";
  const q = query(
    collection(db, `threads/${threadId}/comments`),
    orderBy("created", "asc")
  );
  const snapshot = await getDocs(q);

  if(snapshot.empty) {
    commentListEl.innerHTML = "<li>コメントがまだありません</li>";
    return;
  }

  snapshot.forEach(doc => {
    const li = document.createElement("li");
    li.textContent = doc.data().text;
    commentListEl.appendChild(li);
  });
}

// コメント投稿処理
postCommentBtn.addEventListener("click", async () => {
  if (!canDoAction("lastComment", 5000)) {
    alert("コメントは5秒に1回までです！");
    return;
  }
  const text = commentTextEl.value.trim();
  if (text === "") {
    alert("コメントを入力してください");
    return;
  }
  await addDoc(collection(db, `threads/${currentThreadId}/comments`), {
    text,
    created: serverTimestamp(),
  });
  commentTextEl.value = "";
  loadComments(currentThreadId);
});

// スレ一覧に戻るボタン
backToThreadsBtn.addEventListener("click", () => {
  commentSection.style.display = "none";
  threadSection.style.display = "block";
  currentThreadId = null;
  loadThreads();
});

// 初期読み込み
loadThreads();