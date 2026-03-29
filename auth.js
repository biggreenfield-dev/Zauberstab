/**
 * ZAUBERSTAB — Auth Module
 * ========================
 * Firebase Authentication mit Google & Apple Sign-In.
 * Wird von allen Seiten eingebunden.
 *
 * SETUP:
 * 1. Firebase Projekt erstellen (console.firebase.google.com)
 * 2. Authentication → Sign-in method → Google aktivieren
 * 3. Authentication → Sign-in method → Apple aktivieren (optional, braucht Apple Dev Account)
 * 4. Firebase Config unten eintragen
 */

// ════════════════════════════════════════════════
// FIREBASE CONFIG — Hier deine Firebase-Daten eintragen
// ════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDOAdJfGVJVuaZ9bZJEv2Unk-FEmMcm0j4",
  authDomain: "zauberstab.firebaseapp.com",
  projectId: "zauberstab",
  storageBucket: "zauberstab.firebasestorage.app",
  messagingSenderId: "270660608865",
  appId: "1:270660608865:web:4a88c1ed765559de125b20"
};

// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
let _authUser = null;
let _authReady = false;
const _authCallbacks = [];

function onAuthReady(cb) {
  if (_authReady) cb(_authUser);
  else _authCallbacks.push(cb);
}
function getUser() { return _authUser; }
function isLoggedIn() { return !!_authUser; }

// ════════════════════════════════════════════════
// FIREBASE INIT (deferred — loads SDK from CDN)
// ════════════════════════════════════════════════
let _firebaseAuth = null;
let _firebaseLoaded = false;

function loadFirebase() {
  if (_firebaseLoaded) return Promise.resolve();
  if (!FIREBASE_CONFIG.apiKey) {
    console.warn('Zauberstab Auth: No Firebase config set. Auth disabled.');
    _authReady = true;
    _authCallbacks.forEach(cb => cb(null));
    updateAuthUI();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // Load Firebase SDKs
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js';
      script2.onload = () => {
        // Initialize Firebase
        const app = firebase.initializeApp(FIREBASE_CONFIG);
        _firebaseAuth = firebase.auth();
        _firebaseLoaded = true;

        // Listen for auth state changes
        _firebaseAuth.onAuthStateChanged((user) => {
          _authUser = user ? {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photo: user.photoURL,
            provider: user.providerData[0]?.providerId || 'unknown'
          } : null;
          _authReady = true;
          _authCallbacks.forEach(cb => cb(_authUser));
          updateAuthUI();
        });

        resolve();
      };
      document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
  });
}

// ════════════════════════════════════════════════
// SIGN IN / OUT
// ════════════════════════════════════════════════

async function signInWithGoogle() {
  await loadFirebase();
  if (!_firebaseAuth) return null;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await _firebaseAuth.signInWithPopup(provider);
    return result.user;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return null;
    console.error('Google Sign-In error:', err);
    throw err;
  }
}

async function signInWithApple() {
  await loadFirebase();
  if (!_firebaseAuth) return null;
  try {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await _firebaseAuth.signInWithPopup(provider);
    return result.user;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return null;
    console.error('Apple Sign-In error:', err);
    throw err;
  }
}

async function signOut() {
  if (_firebaseAuth) await _firebaseAuth.signOut();
  _authUser = null;
  updateAuthUI();
}

// ════════════════════════════════════════════════
// AUTH UI — Auto-setup on DOMContentLoaded
// ════════════════════════════════════════════════

function updateAuthUI() {
  // Nav button
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  if (_authUser) {
    navAuth.innerHTML = `
      <div class="nav-user" id="nav-user-menu">
        <img src="${_authUser.photo || ''}" alt="" class="nav-avatar"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
             style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);">
        <div class="nav-avatar-fallback" style="display:none;width:28px;height:28px;border-radius:50%;background:var(--surface2);align-items:center;justify-content:center;font-size:12px;font-weight:700;">
          ${(_authUser.name || _authUser.email || '?').charAt(0).toUpperCase()}
        </div>
      </div>`;
    // Click to show dropdown
    navAuth.querySelector('#nav-user-menu').addEventListener('click', toggleUserMenu);
  } else {
    navAuth.innerHTML = `<button class="btn btn-primary btn-sm" onclick="showAuthModal()">Anmelden</button>`;
  }

  // Update any login-gated elements
  document.querySelectorAll('[data-auth="required"]').forEach(el => {
    el.style.display = _authUser ? '' : 'none';
  });
  document.querySelectorAll('[data-auth="guest"]').forEach(el => {
    el.style.display = _authUser ? 'none' : '';
  });
}

// ════════════════════════════════════════════════
// AUTH MODAL
// ════════════════════════════════════════════════

function showAuthModal(reason) {
  // Remove existing modal
  const existing = document.getElementById('auth-modal');
  if (existing) existing.remove();

  const reasonText = reason || 'Melde dich an um fortzufahren.';

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:500;background:rgba(9,9,11,0.9);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="max-width:400px;width:100%;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;text-align:center;position:relative;">
        <button onclick="document.getElementById('auth-modal').remove()" style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);color:var(--muted);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">×</button>

        <div style="font-size:40px;margin-bottom:20px;">✨</div>
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px;">Bei Zauberstab anmelden</h2>
        <p style="color:var(--muted);font-size:14px;margin-bottom:28px;line-height:1.6;">${reasonText}</p>

        <button id="auth-google-btn" style="width:100%;padding:14px 24px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:var(--bg);color:var(--text);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:all 0.2s;font-family:inherit;">
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Mit Google anmelden
        </button>

        <button id="auth-apple-btn" style="width:100%;padding:14px 24px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:var(--bg);color:var(--text);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;transition:all 0.2s;font-family:inherit;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Mit Apple anmelden
        </button>

        <p style="color:var(--dim);font-size:12px;margin-top:20px;line-height:1.5;">
          Mit der Anmeldung akzeptierst du unsere
          <a href="#" style="color:var(--muted);text-decoration:underline;">Nutzungsbedingungen</a> und
          <a href="#" style="color:var(--muted);text-decoration:underline;">Datenschutzerklärung</a>.
        </p>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('auth-google-btn').addEventListener('click', async () => {
    const btn = document.getElementById('auth-google-btn');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.textContent = 'Wird geladen...';
    try {
      await signInWithGoogle();
      modal.remove();
    } catch (e) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Mit Google anmelden';
    }
  });

  document.getElementById('auth-apple-btn').addEventListener('click', async () => {
    const btn = document.getElementById('auth-apple-btn');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.textContent = 'Wird geladen...';
    try {
      await signInWithApple();
      modal.remove();
    } catch (e) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Mit Apple anmelden';
    }
  });

  // Close on backdrop click
  modal.firstElementChild.addEventListener('click', (e) => {
    if (e.target === modal.firstElementChild) modal.remove();
  });
}

// ════════════════════════════════════════════════
// USER DROPDOWN MENU
// ════════════════════════════════════════════════

function toggleUserMenu() {
  const existing = document.getElementById('user-dropdown');
  if (existing) { existing.remove(); return; }

  const navUser = document.getElementById('nav-user-menu');
  const rect = navUser.getBoundingClientRect();

  const dropdown = document.createElement('div');
  dropdown.id = 'user-dropdown';
  dropdown.innerHTML = `
    <div style="position:fixed;top:${rect.bottom + 8}px;right:24px;z-index:200;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:8px;min-width:220px;box-shadow:0 16px 48px rgba(0,0,0,0.5);">
      <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px;">
        <div style="font-weight:600;font-size:14px;">${_authUser?.name || 'User'}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:2px;">${_authUser?.email || ''}</div>
      </div>
      <a href="verzaubern.html" style="display:block;padding:10px 12px;border-radius:8px;font-size:14px;color:var(--muted);transition:all 0.15s;">✨ Idee verzaubern</a>
      <a href="browse.html" style="display:block;padding:10px 12px;border-radius:8px;font-size:14px;color:var(--muted);transition:all 0.15s;">📋 Ideen durchsuchen</a>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding-top:4px;">
        <button onclick="signOut();document.getElementById('user-dropdown')?.remove();" style="width:100%;text-align:left;padding:10px 12px;border-radius:8px;font-size:14px;color:var(--dim);border:none;background:none;cursor:pointer;font-family:inherit;transition:all 0.15s;">Abmelden</button>
      </div>
    </div>`;

  document.body.appendChild(dropdown);

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && !navUser.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }, 10);
}

// ════════════════════════════════════════════════
// AUTO-INIT
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadFirebase();
});
