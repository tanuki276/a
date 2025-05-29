const nicknameForm = document.getElementById("nicknameForm");
const nicknameInput = document.getElementById("nicknameInput");
const saveNicknameBtn = document.getElementById("saveNicknameBtn");

let currentNickname = null;

// ログイン状態監視の中に追加
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ニックネームをDBから読み込む
    const nicknameRef = ref(db, `nicknames/${user.uid}`);
    onValue(nicknameRef, (snapshot) => {
      currentNickname = snapshot.val();
      if (currentNickname) {
        nicknameForm.style.display = "none";
        status.textContent = `ようこそ ${currentNickname} さん（クリックでログアウト）`;
      } else {
        nicknameForm.style.display = "block";
        status.textContent = `ニックネームを設定してください`;
      }
    });

    loginBtn.style.display = "none";
    threadForm.style.display = "flex";
    loadThreads();
  } else {
    currentNickname = null;
    status.textContent = "ログインしてください";
    loginBtn.style.display = "inline-block";
    threadForm.style.display = "none";
    threadList.innerHTML = "";
    nicknameForm.style.display = "none";
  }
});

// ニックネーム保存
saveNicknameBtn.addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return alert("ニックネームを入力してください");
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください");

  const nicknameRef = ref(db, `nicknames/${user.uid}`);
  await set(nicknameRef, nickname);
  nicknameInput.value = "";
  nicknameForm.style.display = "none";
});

// スレッド作成時はcurrentNicknameを使う
threadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = threadTitleInput.value.trim();
  if (!title) return;

  const user = auth.currentUser;
  if (!user) return alert("ログインしてください");
  if (!currentNickname) return alert("ニックネームを設定してください");

  const threadId = generateRandomId();
  const threadRef = ref(db, "threads/" + threadId);

  await set(threadRef, {
    title,
    creatorUid: user.uid,
    creatorName: currentNickname,
    createdAt: new Date().toISOString(),
  });

  threadTitleInput.value = "";
});