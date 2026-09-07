// App State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showDashboard();
        loadUserData();
    } else {
        showAuth();
    }

    // Event Listeners
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('add-link-form')?.addEventListener('submit', handleAddLink);
    document.getElementById('profile-form')?.addEventListener('submit', handleProfileUpdate);
});

// Auth Functions
function switchAuth(page) {
    document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';
    updateUserUI();
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Mock login (replace with API call)
    const user = {
        id: Math.random().toString(36).substr(2, 9),
        email: email,
        displayName: email.split('@')[0],
        username: email.split('@')[0],
        bio: 'Usuário LinkStash',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };

    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showDashboard();
}

function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const displayName = document.getElementById('register-name').value;
    const password = document.getElementById('register-password').value;

    // Mock register (replace with API call)
    const user = {
        id: Math.random().toString(36).substr(2, 9),
        username: username,
        email: email,
        displayName: displayName,
        bio: 'Bem-vindo ao LinkStash!',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };

    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showDashboard();
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        currentUser = null;
        userLinks = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userLinks');
        showAuth();
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }
}

// UI Functions
function updateUserUI() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.displayName;
        document.getElementById('user-avatar').src = currentUser.avatar;
        document.getElementById('profile-name').textContent = currentUser.displayName;
        document.getElementById('profile-username').textContent = '@' + currentUser.username;
        document.getElementById('profile-avatar').src = currentUser.avatar;
        document.getElementById('profile-display-name').value = currentUser.displayName;
        document.getElementById('profile-bio').value = currentUser.bio || '';
        document.getElementById('profile-avatar-url').value = currentUser.avatar;
        document.getElementById('public-link').value = `linkstash.me/${currentUser.username}`;
        
        updateStats();
        renderLinks();
    }
}

function updateStats() {
    const totalClicks = userLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    document.getElementById('stat-links').textContent = userLinks.length;
    document.getElementById('stat-clicks').textContent = totalClicks;
    document.getElementById('stat-visitors').textContent = Math.floor(totalClicks / 2);
    document.getElementById('stat-plan').textContent = 'Básico';

    // Top link
    if (userLinks.length > 0) {
        const topLink = userLinks.reduce((prev, current) => 
            (prev.clicks || 0) > (current.clicks || 0) ? prev : current
        );
        document.getElementById('top-link').innerHTML = `
            <div style="text-align: left;">
                <p style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${topLink.title}</p>
                <p style="margin-bottom: 10px;">${topLink.description || 'Sem descrição'}</p>
                <div style="display: flex; gap: 20px; opacity: 0.9;">
                    <span><i class="fas fa-mouse"></i> ${topLink.clicks || 0} cliques</span>
                </div>
            </div>
        `;
    }
}

// Links Functions
function openAddLinkModal() {
    document.getElementById('add-link-modal').classList.add('active');
}

function closeAddLinkModal() {
    document.getElementById('add-link-modal').classList.remove('active');
    document.getElementById('add-link-form').reset();
}

function handleAddLink(e) {
    e.preventDefault();
    
    const link = {
        id: Math.random().toString(36).substr(2, 9),
        title: document.getElementById('link-title').value,
        url: document.getElementById('link-url').value,
        description: document.getElementById('link-description').value,
        icon: document.getElementById('link-icon').value,
        clicks: 0,
        createdAt: new Date().toLocaleDateString('pt-BR')
    };

    userLinks.push(link);
    localStorage.setItem('userLinks', JSON.stringify(userLinks));
    
    closeAddLinkModal();
    renderLinks();
    updateStats();
}

function renderLinks() {
    const linksList = document.getElementById('links-list');
    
    if (userLinks.length === 0) {
        linksList.innerHTML = '<p class="empty-state">Você não tem links ainda. Crie um novo!</p>';
        return;
    }

    linksList.innerHTML = userLinks.map(link => `
        <div class="link-card">
            <div class="link-card-header">
                <div>
                    <p class="link-card-title">${link.title}</p>
                    <p class="link-card-description">${link.description || 'Sem descrição'}</p>
                </div>
            </div>
            <a href="${link.url}" target="_blank" class="link-card-url">${link.url}</a>
            <div class="link-card-stats">
                <span class="link-stat">
                    <i class="fas fa-mouse"></i> ${link.clicks || 0} cliques
                </span>
                <span class="link-stat">
                    <i class="fas fa-calendar"></i> ${link.createdAt}
                </span>
            </div>
            <div class="link-card-actions">
                <button class="btn-edit" onclick="editLink('${link.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteLink('${link.id}')">
                    <i class="fas fa-trash"></i> Deletar
                </button>
            </div>
        </div>
    `).join('');
}

function editLink(id) {
    const link = userLinks.find(l => l.id === id);
    if (link) {
        document.getElementById('link-title').value = link.title;
        document.getElementById('link-url').value = link.url;
        document.getElementById('link-description').value = link.description;
        document.getElementById('link-icon').value = link.icon;
        
        // Delete old link
        deleteLink(id);
        openAddLinkModal();
    }
}

function deleteLink(id) {
    if (confirm('Deseja deletar este link?')) {
        userLinks = userLinks.filter(l => l.id !== id);
        localStorage.setItem('userLinks', JSON.stringify(userLinks));
        renderLinks();
        updateStats();
    }
}

// Page Navigation
function goToPage(page) {
    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item')?.classList.add('active');
    
    // Update page
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        links: 'Meus Links',
        analytics: 'Análises',
        profile: 'Meu Perfil',
        settings: 'Configurações'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
}

// Profile Functions
function handleProfileUpdate(e) {
    e.preventDefault();
    
    currentUser.displayName = document.getElementById('profile-display-name').value;
    currentUser.bio = document.getElementById('profile-bio').value;
    currentUser.avatar = document.getElementById('profile-avatar-url').value;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserUI();
    
    alert('Perfil atualizado com sucesso!');
}

function copyToClipboard() {
    const link = document.getElementById('public-link');
    link.select();
    document.execCommand('copy');
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
}

// Settings Functions
function changePassword() {
    alert('Funcionalidade de alterar senha será implementada em breve!');
}

function upgradePlan() {
    alert('Veja nossos planos em linkstash.me');
}

function deleteAccount() {
    if (confirm('Tem certeza? Esta ação é irreversível!')) {
        logout();
    }
}

// Load User Data
function loadUserData() {
    userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];
    updateStats();
    renderLinks();
}

// Simulate Link Clicks
function simulateLinkClick() {
    if (userLinks.length > 0) {
        const randomIndex = Math.floor(Math.random() * userLinks.length);
        userLinks[randomIndex].clicks = (userLinks[randomIndex].clicks || 0) + 1;
        localStorage.setItem('userLinks', JSON.stringify(userLinks));
        updateStats();
    }
}

// Simulate clicks every 10 seconds (demo)
setInterval(() => {
    if (currentUser && userLinks.length > 0) {
        simulateLinkClick();
    }
}, 10000);

// Prevent sidebar nav from actually navigating
document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) {
        e.preventDefault();
    }
});
