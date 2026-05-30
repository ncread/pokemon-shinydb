// js/hunts.js — hunt CRUD, PokeAPI helpers, card rendering

// ── PROBABILITY ──────────────────────────────────────────
function luckyOdds(encounters, odds) {
    if (encounters === 0) return 0;
    return 1 - Math.pow(1 - (1 / odds), encounters);
}

function formatProbability(encounters, odds) {
    return (luckyOdds(encounters, odds) * 100).toFixed(2) + '%';
}

// ── FORMATTING ───────────────────────────────────────────
function formatNumber(n) {
    return Number(n).toLocaleString();
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ── POKEAPI ──────────────────────────────────────────────
async function validatePokemon(nameOrId) {
    const query = String(nameOrId).toLowerCase().trim().replace(/\s+/g, '-');
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
    if (!res.ok) throw new Error('Pokémon not found — check the spelling and try again.');
    const data = await res.json();
    // Gen 1–6 = IDs 1–721
    if (data.id > 721)
        throw new Error('Only Gen 1–6 Pokémon (IDs 1–721) are supported on this site.');
    return { id: data.id, name: data.name };
}

function getShinySprite(pokemonId) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;
}

// ── GAMES & METHODS ──────────────────────────────────────
async function getGames() {
    const { data, error } = await db
        .from('games')
        .select('*')
        .order('generation');
    if (error) throw error;
    return data;
}

async function getMethodsByGame(gameId) {
    const { data, error } = await db
        .from('methods')
        .select('*')
        .eq('game_id', gameId)
        .order('name');
    if (error) throw error;
    return data;
}

// ── HUNTS ────────────────────────────────────────────────
async function getMyHunts(userId) {
    const { data, error } = await db
        .from('shiny_hunts')
        .select(`
            *,
            methods (
                method_id, name, shiny_odds_denom,
                games ( game_id, name, generation )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function getAllHunts() {
    const { data: hunts, error } = await db
        .from('shiny_hunts')
        .select(`
            *,
            methods (
                name, shiny_odds_denom,
                games ( name )
            ),
            profiles ( username )
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return hunts.map(h => ({ ...h, profile: h.profiles }));
}
// async function getAllHunts() {
//     const { data: hunts, error } = await db
//         .from('shiny_hunts')
//         .select(`
//             *,
//             methods (
//                 name, shiny_odds_denom,
//                 games ( name )
//             )
//         `)
//         .order('created_at', { ascending: false });
//     if (error) throw error;

//     // Fetch profiles separately and merge (shiny_hunts.user_id → profiles.id)
//     const { data: profiles } = await db
//         .from('profiles')
//         .select('id, username');
//     const profileMap = Object.fromEntries(
//         (profiles || []).map(p => [p.id, p])
//     );
//     return hunts.map(h => ({
//         ...h,
//         profile: profileMap[h.user_id] || { username: 'unknown' }
//     }));
// }

async function addHunt(userId, pokemonName, pokemonId, methodId) {
    const { data, error } = await db
        .from('shiny_hunts')
        .insert({
            user_id: userId,
            pokemon_name: pokemonName,
            pokemon_id: pokemonId,
            method_id: methodId,
            encounter_count: 0,
            found: false
        })
        .select(`
            *,
            methods (
                method_id, name, shiny_odds_denom,
                games ( game_id, name )
            )
        `)
        .single();
    if (error) throw error;
    return data;
}

async function updateEncounters(huntId, newCount) {
    const { error } = await db
        .from('shiny_hunts')
        .update({ encounter_count: newCount })
        .eq('id', huntId);
    if (error) throw error;
}

async function markAsFound(huntId) {
    const { error } = await db
        .from('shiny_hunts')
        .update({ found: true, found_at: new Date().toISOString() })
        .eq('id', huntId);
    if (error) throw error;
}

async function getHuntsByUsername(username) {
    const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error(`No hunter found with username "${username}".`);

    const { data: hunts, error } = await db
        .from('shiny_hunts')
        .select(`
            *,
            methods (
                name, shiny_odds_denom,
                games ( name )
            ),
            profiles ( username )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return { profile, hunts: hunts.map(h => ({ ...h, profile: h.profiles })) };
}
// async function getHuntsByUsername(username) {
//     // First resolve the username to a user id via profiles
//     const { data: profile, error: profileError } = await db
//         .from('profiles')
//         .select('id, username')
//         .eq('username', username)
//         .maybeSingle();
//     if (profileError) throw profileError;
//     if (!profile) throw new Error(`No hunter found with username "${username}".`);

//     const { data: hunts, error } = await db
//         .from('shiny_hunts')
//         .select(`
//             *,
//             methods (
//                 name, shiny_odds_denom,
//                 games ( name )
//             )
//         `)
//         .eq('user_id', profile.id)
//         .order('created_at', { ascending: false });
//     if (error) throw error;

//     return { profile, hunts };
// }

async function deleteHunt(huntId) {
    const { error } = await db
        .from('shiny_hunts')
        .delete()
        .eq('id', huntId);
    if (error) throw error;
}

// ── CARD RENDERER ────────────────────────────────────────
function renderHuntCard(hunt, isOwner = false) {
    const odds      = hunt.methods.shiny_odds_denom;
    const encounters = hunt.encounter_count;
    const prob      = formatProbability(encounters, odds);
    const isOverdue = encounters > odds && !hunt.found;
    const isFound   = hunt.found;

    const sprite    = getShinySprite(hunt.pokemon_id);
    const gameName  = hunt.methods.games.name;
    const methodName = hunt.methods.name;

    // Encounter buttons + found / delete — only for the owner on active hunts
    const actionsHTML = (isOwner && !isFound) ? `
        <div class="hunt-actions">
            <div class="encounter-buttons">
                <button class="encounter-btn" onclick="handleAddEncounters('${hunt.id}', 1)">+1</button>
                <button class="encounter-btn" onclick="handleAddEncounters('${hunt.id}', 5)">+5</button>
                <button class="encounter-btn" onclick="handleAddEncounters('${hunt.id}', 10)">+10</button>
                <button class="encounter-btn" onclick="handleAddEncounters('${hunt.id}', 50)">+50</button>
            </div>
            <div class="hunt-actions-row">
                <button class="btn btn-success" style="flex:1"
                    onclick="handleMarkFound('${hunt.id}')">✨ Mark as Found!</button>
                <button class="btn btn-danger"
                    onclick="handleDelete('${hunt.id}')">✕</button>
            </div>
        </div>` : '';

    // Found date bar
    const foundBar = (isFound && hunt.found_at)
        ? `<div class="found-bar">✨ Found on ${formatDate(hunt.found_at)}</div>`
        : '';

    // Community footer (username + date)
    const username = hunt.profile?.username || 'unknown';
    const footerHTML = !isOwner ? `
        <div class="hunt-footer">
            <a class="hunt-user" href="hunter.html?user=${encodeURIComponent(username)}"
               style="text-decoration:none; color:var(--teal);">
                👤 ${username}
            </a>
            <span class="hunt-date">${formatDate(hunt.created_at)}</span>
        </div>` : '';

    return `
        <div class="hunt-card ${isFound ? 'found' : ''} ${isOverdue ? 'overdue' : ''}"
             id="hunt-card-${hunt.id}"
             data-encounters="${encounters}">

            <div class="hunt-card-header">
                <div class="pokemon-sprite-wrap">
                    <img class="pokemon-sprite" src="${sprite}" alt="${hunt.pokemon_name}">
                </div>
                <div class="hunt-meta">
                    <div class="pokemon-name">${hunt.pokemon_name}</div>
                    <div class="hunt-game">${gameName}</div>
                    <div class="hunt-method">${methodName}</div>
                </div>
                <span class="hunt-badge ${isFound ? 'found' : 'active'}">
                    ${isFound ? '✨ Found' : '🔍 Hunting'}
                </span>
            </div>

            <div class="hunt-stats">
                <div class="hunt-stat">
                    <span class="stat-label">Encounters</span>
                    <span class="stat-value encounter-display">${formatNumber(encounters)}</span>
                </div>
                <div class="hunt-stat">
                    <span class="stat-label">Odds</span>
                    <span class="stat-value">1/${formatNumber(odds)}</span>
                </div>
                <div class="hunt-stat">
                    <span class="stat-label">Probability</span>
                    <span class="stat-value probability ${isOverdue ? 'overdue' : ''} prob-display">
                        ${prob}
                    </span>
                </div>
            </div>

            ${actionsHTML}
            ${foundBar}
            ${footerHTML}
        </div>`;
}
