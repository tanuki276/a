// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push, onValue, serverTimestamp, set, remove, child, get } from "firebase/database";

// Your web app's Firebase configuration
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

// Initialize Firebase
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
const THREAD_POST_INTERVAL_MS = 60 * 60 * 1000; // 1時間 = 3600000ミリ秒
const COMMENT_POST_INTERVAL_MS = 5 * 1000;      // 5秒 = 5000ミリ秒

const LAST_THREAD_POST_TIME_KEY = 'lastThreadPostTime';
const LAST_COMMENT_POST_TIME_KEY_PREFIX = 'lastCommentPostTime_';

// --- 文字数制限設定 ---
const MAX_THREAD_CONTENT_LENGTH = 30;
const MAX_COMMENT_CONTENT_LENGTH = 100;

// --- ヘルパー関数 ---
function generateDeleteKey() {
    return Math.random().toString(36).substring(2, 8); // 6桁の英数字
}

function updateThrottleMessage(lastPostTime, interval, messageElement) {
    const now = Date.now();
    if (lastPostTime && (now - lastPostTime < interval)) {
        const remainingTime = Math.ceil((interval - (now - lastPostTime)) / 1000);
        messageElement.textContent = `次の投稿まであと ${remainingTime} 秒お待ちください。`;
        return false; // 制限中
    } else {
        messageElement.textContent = '';
        return true; // 投稿可能
    }
}

// --- スレッド投稿機能 ---
submitPostButton.addEventListener('click', async () => {
    const lastThreadPostTime = localStorage.getItem(LAST_THREAD_POST_TIME_KEY);
    const canPost = updateThrottleMessage(lastThreadPostTime, THREAD_POST_INTERVAL_MS, postThrottleMessage);

    if (!canPost) {
        alert("スレッド作成は1時間に1回までです。しばらくお待ちください。");
        return;
    }

    const userName = userNameInput.value.trim() || "名無しさん";
    let postContent = postContentInput.value.trim();

    if (!postContent) {
        alert("スレッド内容を入力してください。");
        return;
    }

    // スレッド内容の文字数チェック
    if (postContent.length > MAX_THREAD_CONTENT_LENGTH) {
        alert(`スレッド内容は${MAX_THREAD_CONTENT_LENGTH}文字以内で入力してください。\n現在の文字数: ${postContent.length}`);
        return;
    }

    const deleteKey = generateDeleteKey(); // 削除キーを生成

    try {
        const newPostRef = push(ref(database, 'threads')); // スレッドを 'threads' パスに保存
        await set(newPostRef, {
            user: userName,
            content: postContent,
            timestamp: serverTimestamp(),
            deleteKey: deleteKey // 削除キーを保存
        });

        localStorage.setItem(LAST_THREAD_POST_TIME_KEY, Date.now()); // 最終投稿時刻を更新

        alert(`スレッドを作成しました！\n\n削除キー: ${deleteKey}\n\nこのキーは紛失すると復元できません。大切に保管してください。`);
        userNameInput.value = '';
        postContentInput.value = '';
        updateThrottleMessage(Date.now(), THREAD_POST_INTERVAL_MS, postThrottleMessage); // メッセージ更新
    } catch (error) {
        console.error("スレッド作成中にエラーが発生しました:", error);
        alert("スレッド作成に失敗しました。もう一度お試しください。");
    }
});

// スレッド投稿制限の表示を定期的に更新
setInterval(() => {
    const lastThreadPostTime = localStorage.getItem(LAST_THREAD_POST_TIME_KEY);
    updateThrottleMessage(lastThreadPostTime, THREAD_POST_INTERVAL_MS, postThrottleMessage);
}, 1000); // 1秒ごとに更新

// --- スレッドのリアルタイム表示とコメント機能 ---
onValue(ref(database, 'threads'), (snapshot) => {
    threadList.innerHTML = ''; // 既存のスレッドをクリア
    const threads = [];
    snapshot.forEach((childSnapshot) => {
        const thread = childSnapshot.val();
        thread.id = childSnapshot.key; // スレッドのIDも取得
        threads.push(thread);
    });

    // スレッドを新しい順にソート (Firebase Realtime Databaseはデフォルトでキー順なので手動ソート)
    threads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    threads.forEach((thread) => {
        const threadElement = document.createElement('li'); // liタグ
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

        // コメント投稿ボタンのイベントリスナー
        const addCommentButton = threadElement.querySelector(`.add-comment-button`);
        addCommentButton.addEventListener('click', (event) => addComment(thread.id, event));
        
        // 削除ボタンのイベントリスナー
        const deleteButton = threadElement.querySelector(`.delete-post-button`);
        deleteButton.addEventListener('click', () => showDeletePrompt(thread.id, 'thread'));

        // コメントも表示
        fetchComments(thread.id);
    });
}, (error) => {
    console.error("スレッドの読み込み中にエラーが発生しました:", error);
    threadList.innerHTML = '<p>スレッドの読み込み中にエラーが発生しました。</p>';
});


// --- コメント機能 ---
async function fetchComments(threadId) {
    const commentsList = document.getElementById(`comments-list-${threadId}`);
    if (!commentsList) return;
    commentsList.innerHTML = ''; // 既存のコメントをクリア

    onValue(ref(database, `threads/${threadId}/comments`), (snapshot) => {
        commentsList.innerHTML = ''; // リアルタイム更新のために再度クリア
        const comments = [];
        snapshot.forEach((childSnapshot) => {
            const comment = childSnapshot.val();
            comment.id = childSnapshot.key;
            comments.push(comment);
        });

        // コメントは古い順に表示（2ch風）
        comments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        comments.forEach((comment) => {
            const commentElement = document.createElement('li');
            commentElement.classList.add('comment-item');
            const date = comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A';
            commentElement.innerHTML = `
                <strong>${comment.user}</strong> <span class="comment-time">(${date})</span>: ${comment.content}
                <button class="delete-comment-button" data-thread-id="${threadId}" data-comment-id="${comment.id}">削除</button>
            `;
            commentsList.appendChild(commentElement);

            // コメント削除ボタンのイベントリスナー
            commentElement.querySelector('.delete-comment-button').addEventListener('click', () => showDeletePrompt(threadId, 'comment', comment.id));
        });
    }, (error) => {
        console.error(`コメントの読み込み中にエラーが発生しました (スレッドID: ${threadId}):`, error);
        commentsList.innerHTML = '<p>コメントの読み込み中にエラーが発生しました。</p>';
    });
}

async function addComment(threadId, event) {
    const commentInput = event.target.previousElementSibling;
    const commentThrottleMessage = document.getElementById(`commentThrottleMessage-${threadId}`);
    
    const lastCommentPostTime = sessionStorage.getItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId);
    const canPost = updateThrottleMessage(lastCommentPostTime, COMMENT_POST_INTERVAL_MS, commentThrottleMessage);

    if (!canPost) {
        alert("コメントは5秒に1回までです。しばらくお待ちください。");
        return;
    }

    const userName = userNameInput.value.trim() || "名無しさん"; // スレッド投稿時の名前を使い回す
    let content = commentInput.value.trim();

    if (!content) {
        alert("コメント内容を入力してください。");
        return;
    }

    // コメント内容の文字数チェック
    if (content.length > MAX_COMMENT_CONTENT_LENGTH) {
        alert(`コメント内容は${MAX_COMMENT_CONTENT_LENGTH}文字以内で入力してください。\n現在の文字数: ${content.length}`);
        return;
    }

    try {
        await push(ref(database, `threads/${threadId}/comments`), {
            user: userName,
            content: content,
            timestamp: serverTimestamp()
        });
        sessionStorage.setItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId, Date.now()); // 最終投稿時刻を更新
        commentInput.value = '';
        updateThrottleMessage(Date.now(), COMMENT_POST_INTERVAL_MS, commentThrottleMessage); // メッセージ更新
    } catch (error) {
        console.error("コメント追加中にエラーが発生しました:", error);
        alert("コメントの追加に失敗しました。");
    }
}

// コメント投稿制限の表示を定期的に更新 (各コメントフォームに対して)
setInterval(() => {
    document.querySelectorAll('.comment-input').forEach(input => {
        const threadId = input.dataset.threadId;
        const lastCommentPostTime = sessionStorage.getItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId);
        const commentThrottleMessage = document.getElementById(`commentThrottleMessage-${threadId}`);
        if (commentThrottleMessage) {
            updateThrottleMessage(lastCommentPostTime, COMMENT_POST_INTERVAL_MS, commentThrottleMessage);
        }
    });
}, 1000); // 1秒ごとに更新


// --- 削除機能 ---
async function showDeletePrompt(id, type, commentId = null) {
    let targetPath;
    if (type === 'thread') {
        targetPath = `threads/${id}`;
    } else if (type === 'comment') {
        targetPath = `threads/${id}/comments/${commentId}`;
    } else {
        return;
    }

    const enteredKey = prompt("削除キーを入力してください:");
    if (enteredKey === null) { // キャンセルされた場合
        return;
    }

    try {
        const snapshot = await get(child(ref(database), targetPath));
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if (type === 'thread') {
                if (data.deleteKey === enteredKey) {
                    if (confirm('本当にこのスレッドを削除しますか？\n（コメントも全て削除されます）')) {
                        await remove(ref(database, targetPath));
                        alert("スレッドを削除しました。");
                    }
                } else {
                    alert("削除キーが異なります。");
                }
            } else if (type === 'comment') {
                 // コメントは削除キーを持たないため、警告して削除を実行
                 // 本来はコメントにもキーを持たせるか、スレッドの削除キーでコメントも一括削除する設計が望ましい
                 if (confirm('本当にこのコメントを削除しますか？（コメントに削除キーはありません）')) {
                     await remove(ref(database, targetPath));
                     alert("コメントを削除しました。");
                 }
            }
        } else {
            alert("対象の投稿が見つかりません。");
        }
    } catch (error) {
        console.error("削除中にエラーが発生しました:", error);
        alert("削除に失敗しました。");
    }
}
