// js/auth.js — sign up, sign in, sign out, auth guards

async function signUp(email, password, username) {
    username = username.trim();
    if (username.length < 3)
        throw new Error('Username must be at least 3 characters.');
    if (!/^[a-zA-Z0-9_]+$/.test(username))
        throw new Error('Username can only contain letters, numbers, and underscores.');

    // Check if username is already taken
    const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
    if (existing) throw new Error('Username already taken.');

    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;

    // The DB trigger auto-creates a profile row with the email prefix as username.
    // We upsert here to set the user's chosen username instead.
    // Requires "Confirm email" to be DISABLED in Supabase Auth → Settings
    // so the session is active immediately after signUp.
    if (data.user) {
        const { error: profileError } = await db
            .from('profiles')
            .upsert({ id: data.user.id, username });
        if (profileError) throw profileError;
    }

    return data;
}

async function signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    await db.auth.signOut();
    window.location.href = 'index.html';
}

async function getUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
}

async function getProfile(userId) {
    const { data } = await db
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
    return data;
}

// Redirect to login if not logged in. Returns the user if authenticated.
async function requireAuth() {
    const user = await getUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// Redirect to dashboard if already logged in (for the login page).
async function redirectIfAuth() {
    const user = await getUser();
    if (user) window.location.href = 'dashboard.html';
}
