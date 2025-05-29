// Firebase SDK のインポート
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push, onValue, serverTimestamp, set, remove, get, child } from "firebase/database";

// Firebaseプロジェクトの設定
const firebaseConfig = {
  apiKey: "AIzaSyBIY3DFsKw2L0LB6MBLR_0f1NXOppCDta8",
  authDomain: "anitb-63dcb.firebaseapp.com",
  databaseURL: "https://anitb-63dcb-default-rtdb.firebaseio.com",
  projectId: "anitb-63dcb",
  storageBucket: "anitb-63dcb.firebasestorage.app",
  messagingSenderId: "196706725748",
  appId: "1:196706725748:web:85c67f85aec5e0fea9c621",
  measurementId: "G-13Z9ZVCTCJ"
};

// Firebaseサービスの初期化
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// DOM要素の取得
const userNameInput = document.getElementById('userName');
const postContentInput = document.getElementById('postContent'); // スレッド内容
const submitPostButton = document.getElementById('submitPost');
const postThrottleMessage = document.getElementById('postThrottleMessage');
const threadList = document.getElementById('threadList');

// --- 時間制限設定 ---
const THREAD_POST_INTERVAL_MS = 60 * 60 * 1000; // 1時間
const COMMENT_POST_INTERVAL_MS = 5 * 1000;      // 5秒

const LAST_THREAD_POST_TIME_KEY = 'lastThreadPostTime';
const LAST_COMMENT_POST_TIME_KEY_PREFIX = 'lastCommentPostTime_'; // スレッドごとに識別

// --- 文字数制限設定 ---
const MAX_USERNAME_LENGTH = 20; // ユーザー名の最大長
const MAX_THREAD_CONTENT_LENGTH = 30; // スレッド内容の最大長
const MAX_COMMENT_CONTENT_LENGTH = 100; // コメント内容の最大長

// --- ヘルパー関数 ---

/**
 * 削除キーを生成する関数
 * @returns {string} 6桁の英数字の削除キー
 */
function generateDeleteKey() {
    return Math.random().toString(36).substring(2, 8); // 6桁の英数字
}

/**
 * 投稿・コメントのスロットル（時間制限）メッセージを更新し、投稿可能かどうかを返す
 * また、関連するボタンの有効/無効状態も制御する。
 * @param {number|null} lastPostTime - localStorage/sessionStorageに保存された最終投稿時刻 (Date.now()形式)
 * @param {number} interval - 制限間隔 (ミリ秒)
 * @param {HTMLElement} messageElement - メッセージを表示するDOM要素
 * @param {HTMLButtonElement|null} buttonElement - 制御するボタン要素 (オプション)
 * @returns {boolean} 投稿可能であれば true, 制限中であれば false
 */
function updateThrottleStatus(lastPostTime, interval, messageElement, buttonElement = null) {
    const now = Date.now();
    if (lastPostTime && (now - lastPostTime < interval)) {
        const remainingTime = Math.ceil((interval - (now - lastPostTime)) / 1000);
        const unit = interval === THREAD_POST_INTERVAL_MS ? "スレッド作成" : "コメント投稿";
        messageElement.textContent = `${unit}はあと ${remainingTime} 秒お待ちください。`;
        if (buttonElement) {
            buttonElement.disabled = true;
        }
        return false; // 制限中
    } else {
        messageElement.textContent = '';
        if (buttonElement) {
            buttonElement.disabled = false;
        }
        return true; // 投稿可能
    }
}

// --- スレッド投稿機能 ---
submitPostButton.addEventListener('click', async () => {
    // 投稿制限のチェック
    const lastThreadPostTime = localStorage.getItem(LAST_THREAD_POST_TIME_KEY);
    const canPost = updateThrottleStatus(lastThreadPostTime, THREAD_POST_INTERVAL_MS, postThrottleMessage, submitPostButton);

    if (!canPost) {
        // スロットルメッセージが表示されているのでアラートは不要
        return;
    }

    // 入力値の取得とトリム
    const userName = userNameInput.value.trim() || "名無しさん";
    const postContent = postContentInput.value.trim();

    // クライアント側でのバリデーション
    if (!postContent) {
        alert("スレッド内容を入力してください。");
        return;
    }
    if (postContent.length > MAX_THREAD_CONTENT_LENGTH) {
        alert(`スレッド内容は${MAX_THREAD_CONTENT_LENGTH}文字以内で入力してください。\n現在の文字数: ${postContent.length}`);
        return;
    }
    if (userName.length > MAX_USERNAME_LENGTH) {
        alert(`名前は${MAX_USERNAME_LENGTH}文字以内で入力してください。\n現在の文字数: ${userName.length}`);
        return;
    }

    const deleteKey = generateDeleteKey(); // 削除キーを生成

    try {
        // Firebase Realtime Databaseにスレッドをプッシュ
        const newPostRef = push(ref(database, 'threads'));
        await set(newPostRef, {
            user: userName,
            content: postContent,
            timestamp: serverTimestamp(), // Firebaseのサーバータイムスタンプを使用
            deleteKey: deleteKey // 削除キーを保存
        });

        // 最終投稿時刻をlocalStorageに保存
        localStorage.setItem(LAST_THREAD_POST_TIME_KEY, Date.now());

        alert(`スレッドを作成しました！\n\n削除キー: ${deleteKey}\n\nこのキーは紛失すると復元できません。大切に保管してください。`);
        // userNameInput.value = ''; // 名前はクリアしない（2ch風）
        postContentInput.value = ''; // 投稿内容をクリア

        // ボタンの状態とメッセージを即座に更新
        updateThrottleStatus(Date.now(), THREAD_POST_INTERVAL_MS, postThrottleMessage, submitPostButton);
    } catch (error) {
        console.error("スレッド作成中にエラーが発生しました:", error);
        // Firebaseからのエラーメッセージを解析して表示
        let errorMessage = "スレッド作成に失敗しました。";
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。（不正なデータ、権限なしなど）";
        } else if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        }
        alert(errorMessage + " もう一度お試しください。");
    }
});

// スレッド投稿制限の表示を定期的に更新（1秒ごと）
setInterval(() => {
    const lastThreadPostTime = localStorage.getItem(LAST_THREAD_POST_TIME_KEY);
    updateThrottleStatus(lastThreadPostTime, THREAD_POST_INTERVAL_MS, postThrottleMessage, submitPostButton);
}, 1000);

// --- スレッドのリアルタイム表示 ---
onValue(ref(database, 'threads'), (snapshot) => {
    // スレッドが存在しない場合の表示
    if (!snapshot.exists()) {
        threadList.innerHTML = '<p style="text-align: center; color: #777;">まだスレッドがありません。最初のスレッドを立ててみましょう！</p>';
        return;
    }

    threadList.innerHTML = ''; // 既存のスレッドをクリア
    const threads = [];
    snapshot.forEach((childSnapshot) => {
        const thread = childSnapshot.val();
        thread.id = childSnapshot.key; // スレッドのユニークIDを取得
        threads.push(thread);
    });

    // スレッドを新しい順にソート（Firebase Realtime Databaseはキー順なので手動ソートが必要）
    threads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 各スレッドをDOMに表示
    threads.forEach((thread) => {
        const threadElement = document.createElement('li');
        threadElement.classList.add('thread-item');

        const date = thread.timestamp ? new Date(thread.timestamp).toLocaleString() : 'N/A';

        threadElement.innerHTML = `
            <div class="thread-header">
                <div class="thread-info">
                    <span class="thread-user">${thread.user} ${thread.user === "名無しさん" ? '' : 'さん'}</span>
                    <span class="thread-time">${date}</span>
                </div>
                <button class="delete-post-button" data-thread-id="${thread.id}">削除</button>
            </div>
            <div class="thread-content">${thread.content}</div>

            <div class="comments-section" id="comments-section-${thread.id}">
                <ul class="comments-list" id="comments-list-${thread.id}">
                    </ul>
                <div class="comment-form">
                    <input type="text" class="comment-input" placeholder="コメントする (100文字以内)" maxlength="100" data-thread-id="${thread.id}">
                    <button class="add-comment-button" data-thread-id="${thread.id}">コメント</button>
                </div>
                <div id="commentThrottleMessage-${thread.id}" class="comment-throttle-message"></div>
            </div>
        `;
        threadList.appendChild(threadElement);

        // コメント投稿ボタンのイベントリスナーを設定
        const addCommentButton = threadElement.querySelector(`.add-comment-button`);
        addCommentButton.addEventListener('click', (event) => addComment(thread.id, event));

        // スレッド削除ボタンのイベントリスナーを設定
        const deleteButton = threadElement.querySelector(`.delete-post-button`);
        deleteButton.addEventListener('click', () => showDeletePrompt(thread.id, 'thread'));

        // そのスレッドのコメントを読み込み・表示
        fetchComments(thread.id);
    });
}, (error) => {
    console.error("スレッドの読み込み中にエラーが発生しました:", error);
    let errorMessage = "スレッドの読み込み中にエラーが発生しました。";
    if (error.message && error.message.includes('Network Error')) {
        errorMessage += "ネットワーク接続を確認してください。";
    }
    threadList.innerHTML = `<p style="color: red; text-align: center;">${errorMessage}</p>`;
});


// --- コメント機能 ---

/**
 * 特定のスレッドのコメントをリアルタイムで取得し表示する関数
 * @param {string} threadId - コメントを取得するスレッドのID
 */
async function fetchComments(threadId) {
    const commentsList = document.getElementById(`comments-list-${threadId}`);
    if (!commentsList) return;

    // Realtime DatabaseのonValueでコメントのリアルタイムリスナーを設定
    onValue(ref(database, `threads/${threadId}/comments`), (snapshot) => {
        commentsList.innerHTML = ''; // リアルタイム更新のために毎回リストをクリア
        const comments = [];
        snapshot.forEach((childSnapshot) => {
            const comment = childSnapshot.val();
            comment.id = childSnapshot.key; // コメントのユニークIDを取得
            comments.push(comment);
        });

        // コメントは古い順に表示（2ch風）
        comments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // コメントがない場合のメッセージ
        if (comments.length === 0) {
            commentsList.innerHTML = '<li class="comment-item" style="text-align: center; color: #999;">まだコメントはありません。</li>';
        } else {
            // 各コメントをDOMに表示
            comments.forEach((comment) => {
                const commentElement = document.createElement('li');
                commentElement.classList.add('comment-item');
                const date = comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A';
                commentElement.innerHTML = `
                    <strong>${comment.user}</strong> <span class="comment-time">(${date})</span>: ${comment.content}
                    <button class="delete-comment-button" data-thread-id="${threadId}" data-comment-id="${comment.id}">削除</button>
                `;
                commentsList.appendChild(commentElement);

                // コメント削除ボタンのイベントリスナーを設定
                commentElement.querySelector('.delete-comment-button').addEventListener('click', () => showDeletePrompt(threadId, 'comment', comment.id));
            });
        }
    }, (error) => {
        console.error(`コメントの読み込み中にエラーが発生しました (スレッドID: ${threadId}):`, error);
        commentsList.innerHTML = '<p style="color: red; text-align: center;">コメントの読み込み中にエラーが発生しました。</p>';
    });
}

/**
 * コメントをスレッドに追加する関数
 * @param {string} threadId - コメントを追加するスレッドのID
 * @param {Event} event - クリックイベントオブジェクト
 */
async function addComment(threadId, event) {
    const commentInput = event.target.previousElementSibling; // コメント入力欄
    const addCommentButton = event.target; // コメントボタン自体
    const commentThrottleMessage = document.getElementById(`commentThrottleMessage-${threadId}`);

    // コメント投稿制限のチェック
    const lastCommentPostTime = sessionStorage.getItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId);
    const canPost = updateThrottleStatus(lastCommentPostTime, COMMENT_POST_INTERVAL_MS, commentThrottleMessage, addCommentButton);

    if (!canPost) {
        return;
    }

    // 入力値の取得とトリム
    const userName = userNameInput.value.trim() || "名無しさん"; // スレッド投稿時の名前を使い回す
    const content = commentInput.value.trim();

    // クライアント側でのバリデーション
    if (!content) {
        alert("コメント内容を入力してください。");
        return;
    }
    if (content.length > MAX_COMMENT_CONTENT_LENGTH) {
        alert(`コメント内容は${MAX_COMMENT_CONTENT_LENGTH}文字以内で入力してください。\n現在の文字数: ${content.length}`);
        return;
    }
    if (userName.length > MAX_USERNAME_LENGTH) {
        alert(`名前は${MAX_USERNAME_LENGTH}文字以内で入力してください。\n現在の文字数: ${userName.length}`);
        return;
    }

    try {
        // Firebase Realtime Databaseにコメントをプッシュ
        await push(ref(database, `threads/${threadId}/comments`), {
            user: userName,
            content: content,
            timestamp: serverTimestamp()
        });
        sessionStorage.setItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId, Date.now()); // 最終投稿時刻を更新
        commentInput.value = ''; // コメント入力欄をクリア

        // ボタンの状態とメッセージを即座に更新
        updateThrottleStatus(Date.now(), COMMENT_POST_INTERVAL_MS, commentThrottleMessage, addCommentButton);
    } catch (error) {
        console.error("コメント追加中にエラーが発生しました:", error);
        let errorMessage = "コメントの追加に失敗しました。";
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。（不正なデータ、権限なしなど）";
        } else if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        }
        alert(errorMessage + " もう一度お試しください。");
    }
}

// コメント投稿制限の表示を定期的に更新（1秒ごと）
// 各コメントフォームに対して個別に行う
setInterval(() => {
    document.querySelectorAll('.comment-input').forEach(input => {
        const threadId = input.dataset.threadId;
        const lastCommentPostTime = sessionStorage.getItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId);
        const commentThrottleMessage = document.getElementById(`commentThrottleMessage-${threadId}`);
        const addCommentButton = input.nextElementSibling; // inputの次の要素がボタン
        if (commentThrottleMessage && addCommentButton) {
            updateThrottleStatus(lastCommentPostTime, COMMENT_POST_INTERVAL_MS, commentThrottleMessage, addCommentButton);
        }
    });
}, 1000);

// --- 削除機能 ---

/**
 * 投稿（スレッドまたはコメント）の削除キー入力プロンプトを表示し、削除を実行する関数
 * @param {string} id - スレッドID
 * @param {'thread'|'comment'} type - 削除対象のタイプ ('thread' または 'comment')
 * @param {string|null} commentId - コメントの場合のコメントID (スレッドの場合はnull)
 */
async function showDeletePrompt(id, type, commentId = null) {
    let targetPath;
    let dataRef;
    if (type === 'thread') {
        targetPath = `threads/${id}`;
        dataRef = ref(database, targetPath);
    } else if (type === 'comment') {
        targetPath = `threads/${id}/comments/${commentId}`;
        dataRef = ref(database, targetPath);
    } else {
        console.error("無効な削除タイプです:", type);
        return;
    }

    const enteredKey = prompt("削除キーを入力してください:");
    if (enteredKey === null || enteredKey.trim() === '') { // キャンセルまたは空入力の場合
        return;
    }

    try {
        const snapshot = await get(dataRef);
        if (snapshot.exists()) {
            const data = snapshot.val();

            if (type === 'thread') {
                // スレッドの場合のみ削除キーをチェック
                if (data.deleteKey === enteredKey) {
                    if (confirm('本当にこのスレッドを削除しますか？\n（このスレッド内のコメントも全て削除されます）')) {
                        await remove(dataRef);
                        alert("スレッドを削除しました。");
                    }
                } else {
                    alert("削除キーが異なります。");
                }
            } else if (type === 'comment') {
                // コメントは現在削除キーを持たないため、確認のみで削除
                // （この設計はセキュリティが低いので、本番では見直しが必要）
                if (confirm('本当にこのコメントを削除しますか？（コメントに削除キーはありません）')) {
                    await remove(dataRef);
                    alert("コメントを削除しました。");
                }
            }
        } else {
            alert("対象の投稿が見つかりません。すでに削除されている可能性があります。");
        }
    } catch (error) {
        console.error("削除中にエラーが発生しました:", error);
        let errorMessage = "削除に失敗しました。";
        if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        } else if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。";
        }
        alert(errorMessage + " もう一度お試しください。");
    }
}
