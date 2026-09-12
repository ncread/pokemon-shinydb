// js/hunts.js — hunt CRUD, PokeAPI helpers, card rendering

const GAME_COLORS = {
    'gold':             '#D4AF37',
    'silver':           '#c0c0c0',
    'crystal':          '#4fc8ff',
    'ruby':             '#c83030',
    'sapphire':         '#3060d0',
    'firered':          '#ff4020',
    'leafgreen':        '#5CA904',
    'emerald':          '#50C878',
    'diamond':          '#88aaff',
    'pearl':            '#ffaacc',
    'platinum':         '#E5E4E2',
    'heartgold':        '#e8a000',
    'soulsilver':       '#c0c0e0',
    'black':            '#606060',
    'white':            '#d0d0d0',
    'black 2':          '#505070',
    'white 2':          '#b0b0d0',
    'x':                '#4040d0',
    'y':                '#c03030',
    'omega ruby':       '#d03838',
    'alpha sapphire':   '#2850d0',
};

function getGameColor(gameName) {
    return GAME_COLORS[gameName.toLowerCase()] || 'var(--teal)';
}





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
    const date = new Date(iso);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysElapsed(startIso, endIso = null) {
    const start = new Date(startIso);
    const end   = endIso ? new Date(endIso) : new Date();
    const diff  = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return diff;
}

function formatDateShort(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

// ── POKEAPI ──────────────────────────────────────────────
let pokemonList = null;

const GEN1_5_ALT_FORMS = [
    'deoxys-attack', 'deoxys-defense', 'deoxys-speed',
    'wormadam-sandy', 'wormadam-trash',
    'giratina-origin',
    'shaymin-sky',
    'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow',
    'tornadus-therian',
    'thundurus-therian',
    'landorus-therian',
    'kyurem-black', 'kyurem-white',
    'keldeo-resolute',
    'meloetta-pirouette'
];

async function loadPokemonList() {
    if (pokemonList) return pokemonList;
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=649');
    const data = await res.json();
    pokemonList = [...data.results.map(p => p.name), ...GEN1_5_ALT_FORMS];
    return pokemonList;
}

function searchPokemon(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim().replace(/\s+/g, '-');
    return pokemonList.filter(name => name.includes(q)).slice(0, 8);
}

async function validatePokemon(nameOrId) {
    const query = String(nameOrId).toLowerCase().trim().replace(/\s+/g, '-');
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
    if (!res.ok) throw new Error('Pokémon not found — check the spelling and try again.');
    const data = await res.json();
    const isBaseForm = data.id >= 1 && data.id <= 649;
    const isAltForm  = GEN1_5_ALT_FORMS.includes(data.name);
    if (!isBaseForm && !isAltForm)
        throw new Error('Only Gen 1–5 Pokémon are supported on this site.');
    return { id: data.id, name: data.name };
}

function getShinySprite(pokemonId, name = null) {
    if (pokemonId) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${name}.png`;
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
    // Parent hunts with their phase chips
    const { data: parentHunts, error: parentError } = await db
        .from('shiny_hunts')
        .select(`
            *,
            methods (
                method_id, name, shiny_odds_denom,
                games ( game_id, name, generation )
            ),
            phases:shiny_hunts!phase_of (
                id, pokemon_name, pokemon_id, encounter_count
            )
        `)
        .eq('user_id', userId)
        .is('phase_of', null)
        .order('created_at', { ascending: false });
    if (parentError) throw parentError;

    // Phase hunts as their own found cards
    const { data: phaseHunts, error: phaseError } = await db
        .from('shiny_hunts')
        .select(`
            *,
            methods (
                method_id, name, shiny_odds_denom,
                games ( game_id, name, generation )
            )
        `)
        .eq('user_id', userId)
        .not('phase_of', 'is', null)
        .order('created_at', { ascending: false });
    if (phaseError) throw phaseError;

    const phaseHuntsWithEmpty = (phaseHunts || []).map(h => ({ ...h, phases: [] }));
    return [...parentHunts, ...phaseHuntsWithEmpty];
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
            phases:shiny_hunts!phase_of (
                id, pokemon_name, pokemon_id, encounter_count
            )
        `)
        .is('phase_of', null)
        .order('created_at', { ascending: false });
    if (error) throw error;
    const { data: profiles } = await db
        .from('profiles')
        .select('id, username');
    const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.id, p])
    );
    return hunts.map(h => ({ ...h, profile: profileMap[h.user_id] || { username: 'unknown' } }));
}


async function addHunt(userId, pokemonName, pokemonId, methodId) {
    const { data, error } = await db
        .from('shiny_hunts')
        .insert({
            user_id: userId,
            pokemon_name: pokemonName,
            pokemon_id: pokemonId,
            method_id: methodId,
            encounter_count: 0,
            found: false,
            created_at: new Date().toISOString()
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
    return { ...data, phases: [] };
}

async function addPhaseHunt(parentHunt, phasePokemonName, phasePokemonId) {
    // Insert the phase hunt (the pokemon that was found)
    const { data: phaseHunt, error: phaseError } = await db
        .from('shiny_hunts')
        .insert({
            user_id:        parentHunt.user_id,
            pokemon_name:   phasePokemonName,
            pokemon_id:     phasePokemonId,
            method_id:      parentHunt.method_id,
            encounter_count: parentHunt.encounter_count,
            found:          true,
            found_at:       new Date().toISOString(),
            created_at:     parentHunt.created_at,
            phase_of:       parentHunt.id
        })
        .select(`*, methods ( name, shiny_odds_denom, games ( name ) )`)
        .single();
    if (phaseError) throw phaseError;

    // Reset parent encounter count to 0
    const { error: resetError } = await db
        .from('shiny_hunts')
        .update({ encounter_count: 0 })
        .eq('id', parentHunt.id);
    if (resetError) throw resetError;

    return phaseHunt;
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
                <button class="encounter-btn" onclick="handleAddEncounters('${hunt.id}', -5)">-5</button>
            </div>
            <div class="hunt-actions-row">
                <button class="btn btn-success" style="flex:1"
                    onclick="handleMarkFound('${hunt.id}')">✨ Mark as Found!</button>
                <button class="btn btn-secondary btn-sm"
                    onclick="openPhaseModal('${hunt.id}')">+ Phase</button>
                <button class="btn btn-danger"
                    onclick="handleDelete('${hunt.id}')">✕</button>
            </div>
        </div>` : '';

    const days = daysElapsed(hunt.created_at, hunt.found ? hunt.found_at : null);
    const foundBar = (isFound && hunt.found_at)
        ? `<div class="hunt-datebar">
               <span>Started ${formatDateShort(hunt.created_at)}</span>
               ${days >= -1 ? `<span class="hunt-datebar-days">${days + 2}d hunt</span>` : ''}
           </div>
           ${isOwner ? `<div class="found-bar">✨ Found on ${formatDate(hunt.found_at)}</div>` : ''}`
        : '';

    //Phases
    const phases = hunt.phases || [];
    const phasesHTML = phases.length > 0 ? `
        <div class="phase-bubble-wrap">
            <div class="phase-bubble">
                ✨ ${phases.length} phase${phases.length > 1 ? 's' : ''}
            </div>
            <div class="phase-tooltip">
                ${phases.map(p => `
                    <div class="phase-tooltip-row">
                        <img src="${getShinySprite(p.pokemon_id)}" alt="${p.pokemon_name}">
                        <span class="phase-tooltip-name">${p.pokemon_name}</span>
                        <span class="phase-tooltip-count">${formatNumber(p.encounter_count)}</span>
                    </div>`).join('')}
            </div>
        </div>` : '';

    // Found date bar
    // const foundBar = (isFound && hunt.found_at)
    //     ? `<div class="found-bar">✨ Found on ${formatDate(hunt.found_at)}</div>`
    //     : '';

    // Community footer (username + date)
    const username = hunt.profile?.username || 'unknown';
    const footerHTML = !isOwner ? `
        <div class="hunt-footer">
            <a class="hunt-user" href="/pokemon-shinydb/hunter/?user=${encodeURIComponent(username)}"
               style="text-decoration:none; color:var(--teal);">
                👤 ${username}
            </a>
            ${isFound && hunt.found_at ? `<span style="font-size:0.76rem; color:var(--gold);">✨ Found on ${formatDate(hunt.found_at)}</span>` : ''}
        </div>` : '';

    const dateBarHTML = days < 0 ? '' : hunt.found
        ? `<div class="hunt-datebar">
            <span>Found ${formatDateShort(hunt.found_at)}</span>
            <span class="hunt-datebar-days">${days}d</span>
        </div>`
        : `<div class="hunt-datebar">
            <span>Started ${formatDateShort(hunt.created_at)}</span>
            <span class="hunt-datebar-days">${days}d elapsed</span>
        </div>`;

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
                    <div class="hunt-game" style="color:${getGameColor(gameName)}" title="${gameName}">${gameName}</div>
                    <div class="hunt-method">${methodName}</div>
                </div>
                <div class="hunt-card-right">
                    <span class="hunt-badge ${isFound ? 'found' : 'active'}">
                        ${isFound ? '✨ Found' : '🔍 Hunting'}
                    </span>
                    ${phasesHTML}
                </div>
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
            ${dateBarHTML}
            ${footerHTML}
        </div>`;
}
