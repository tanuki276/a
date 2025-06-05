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

const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const database = firebase.database(app);

const THREAD_POST_INTERVAL_MS = 60 * 60 * 1000;
const COMMENT_POST_INTERVAL_MS = 5 * 1000;

const LAST_THREAD_POST_TIME_KEY = 'lastThreadPostTime';
const LAST_COMMENT_POST_TIME_KEY_PREFIX = 'lastCommentPostTime_';

const MAX_USERNAME_LENGTH = 20;
const MAX_THREAD_CONTENT_LENGTH = 30;
const MAX_COMMENT_CONTENT_LENGTH = 100;

function generateDeleteKey() {
    return Math.random().toString(36).substring(2, 8);
}

function updateThrottleStatus(lastPostTime, interval) {
    const now = Date.now();
    if (lastPostTime && (now - lastPostTime < interval)) {
        return false;
    }
    return true;
}

async function submitPost(userName, postContent) {
    const lastThreadPostTime = localStorage.getItem(LAST_THREAD_POST_TIME_KEY);
    if (!updateThrottleStatus(lastThreadPostTime, THREAD_POST_INTERVAL_MS)) {
        return { success: false, message: "投稿制限中です。" };
    }

    userName = userName.trim() || "名無しさん";
    postContent = postContent.trim();

    if (!postContent) {
        return { success: false, message: "スレッド内容を入力してください。" };
    }
    if (postContent.length > MAX_THREAD_CONTENT_LENGTH) {
        return { success: false, message: `スレッド内容は${MAX_THREAD_CONTENT_LENGTH}文字以内で入力してください。` };
    }
    if (userName.length > MAX_USERNAME_LENGTH) {
        return { success: false, message: `名前は${MAX_USERNAME_LENGTH}文字以内で入力してください。` };
    }

    const deleteKey = generateDeleteKey();

    try {
        const newPostRef = firebase.database().ref('threads').push();
        await newPostRef.set({
            user: userName,
            content: postContent,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            deleteKey: deleteKey
        });

        localStorage.setItem(LAST_THREAD_POST_TIME_KEY, Date.now());
        return { success: true, message: `スレッドを作成しました！ 削除キー: ${deleteKey}` };
    } catch (error) {
        let errorMessage = "スレッド作成に失敗しました。";
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。";
        } else if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        }
        return { success: false, message: errorMessage };
    }
}

async function fetchThreads() {
    try {
        const snapshot = await firebase.database().ref('threads').once('value');
        if (!snapshot.exists()) {
            return [];
        }

        const threads = [];
        snapshot.forEach(childSnapshot => {
            const thread = childSnapshot.val();
            thread.id = childSnapshot.key;
            threads.push(thread);
        });

        threads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return threads;
    } catch (error) {
        throw new Error("スレッドの読み込み中にエラーが発生しました。");
    }
}

async function addComment(threadId, userName, content) {
    const lastCommentPostTime = sessionStorage.getItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId);
    if (!updateThrottleStatus(lastCommentPostTime, COMMENT_POST_INTERVAL_MS)) {
        return { success: false, message: "コメント投稿制限中です。" };
    }

    userName = userName.trim() || "名無しさん";
    content = content.trim();

    if (!content) {
        return { success: false, message: "コメント内容を入力してください。" };
    }
    if (content.length > MAX_COMMENT_CONTENT_LENGTH) {
        return { success: false, message: `コメント内容は${MAX_COMMENT_CONTENT_LENGTH}文字以内で入力してください。` };
    }
    if (userName.length > MAX_USERNAME_LENGTH) {
        return { success: false, message: `名前は${MAX_USERNAME_LENGTH}文字以内で入力してください。` };
    }

    try {
        await firebase.database().ref(`threads/${threadId}/comments`).push({
            user: userName,
            content: content,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        sessionStorage.setItem(LAST_COMMENT_POST_TIME_KEY_PREFIX + threadId, Date.now());
        return { success: true, message: "コメントを追加しました。" };
    } catch (error) {
        let errorMessage = "コメントの追加に失敗しました。";
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。";
        } else if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        }
        return { success: false, message: errorMessage };
    }
}

async function fetchComments(threadId) {
    try {
        const snapshot = await firebase.database().ref(`threads/${threadId}/comments`).once('value');
        const comments = [];
        snapshot.forEach(childSnapshot => {
            const comment = childSnapshot.val();
            comment.id = childSnapshot.key;
            comments.push(comment);
        });

        comments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return comments;
    } catch (error) {
        throw new Error("コメントの読み込み中にエラーが発生しました。");
    }
}

async function deletePost(id, type, enteredKey, commentId = null) {
    let targetPath;
    if (type === 'thread') {
        targetPath = `threads/${id}`;
    } else if (type === 'comment') {
        targetPath = `threads/${id}/comments/${commentId}`;
    } else {
        return { success: false, message: "無効な削除タイプです。" };
    }

    try {
        const snapshot = await firebase.database().ref(targetPath).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();

            if (type === 'thread') {
                if (data.deleteKey === enteredKey) {
                    await firebase.database().ref(targetPath).remove();
                    return { success: true, message: "スレッドを削除しました。" };
                } else {
                    return { success: false, message: "削除キーが異なります。" };
                }
            } else if (type === 'comment') {
                await firebase.database().ref(targetPath).remove();
                return { success: true, message: "コメントを削除しました。" };
            }
        } else {
            return { success: false, message: "対象の投稿が見つかりません。" };
        }
    } catch (error) {
        let errorMessage = "削除に失敗しました。";
        if (error.message && error.message.includes('Network Error')) {
            errorMessage += "ネットワーク接続を確認してください。";
        } else if (error.code === 'PERMISSION_DENIED') {
            errorMessage += "データベースのルールにより拒否されました。";
        }
        return { success: false, message: errorMessage };
    }
}