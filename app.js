
// ============================================
// SAEPVision - JAVASCRIPT PRINCIPAL
// ============================================

const $ = (seletor) => document.querySelector(seletor);

let currentUser = null;
let searchTimer = null;
let searchRequest = 0;

// Elementos principais
const modal = $('#modal');
const sidebar = $('#sidebar');
const searchInput = $('#search');
const gallery = $('#gallery');

// ============================================
// COMUNICAÇÃO COM O SERVIDOR
// ============================================

async function api(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error('Não foi possível conectar ao servidor.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.erro || 'Ocorreu um erro na operação.'
        );

        error.status = response.status;
        throw error;
    }

    return data;
}

// ============================================
// MENSAGENS
// ============================================

function showNotice(message = '') {
    $('#notice').textContent = message;
}

function showLoginError(message = '') {
    $('#loginError').textContent = message;
}

// ============================================
// LOGIN E MODAL
// ============================================

function openLogin() {
    modal.classList.remove('hidden');
    showLoginError('');
    $('#email').focus();
}

function closeLogin() {
    modal.classList.add('hidden');
}

$('#closeModal').addEventListener('click', closeLogin);

$('#cancelLogin').addEventListener('click', closeLogin);

modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeLogin();
    }
});

// ============================================
// CARREGAR USUÁRIO LOGADO
// ============================================

async function loadUser() {
    try {
        const data = await api('/api/me');

        currentUser = data.user;

        $('#userName').textContent =
            currentUser?.nome || 'SAEPVision';

        $('#avatar').src = currentUser?.imagem_usuario
            ? `/assets/imagens_usuarios/${encodeURIComponent(currentUser.imagem_usuario)}`
            : '/assets/imagens_usuarios/usuario1.jpg';

        $('#avatar').onerror = () => {
            $('#avatar').src =
                '/assets/imagens_usuarios/usuario1.jpg';
        };

        $('#loginBtn').textContent = currentUser
            ? 'Logout'
            : 'Login';

        const isPhotographer =
            currentUser?.tipo === 'fotografo';

        $('#profileBtn').disabled = !isPhotographer;

        return currentUser;

    } catch (error) {
        currentUser = null;
        showNotice(error.message);
        return null;
    }
}

// ============================================
// BOTÃO DE LOGIN E LOGOUT
// ============================================

$('#loginBtn').addEventListener('click', () => {
    if (currentUser) {
        logout();
    } else {
        openLogin();
    }
});

// ============================================
// ENVIAR LOGIN
// ============================================

$('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    showLoginError('');

    const email = $('#email').value.trim();
    const senha = $('#password').value;

    if (!email || !senha) {
        showLoginError('Preencha o e-mail e a senha.');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showLoginError('Digite um e-mail válido.');
        return;
    }

    try {
        await api('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        closeLogin();

        $('#loginForm').reset();

        await loadUser();

        await loadPhotos();

        showNotice('Login realizado com sucesso!');

    } catch (error) {
        showLoginError(error.message);
    }
});

// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        await api('/api/logout', {
            method: 'POST'
        });

        currentUser = null;

        sidebar.classList.add('hidden');

        await loadUser();

        await loadPhotos();

        showNotice('Você saiu da sua conta.');

    } catch (error) {
        showNotice(error.message);
    }
}

// ============================================
// PESQUISA DE FOTÓGRAFOS
// ============================================

function normalizeSearch(value) {
    return value
        .trim()
        .replace(/^@/, '')
        .trim();
}

async function loadPhotos(query = '') {
    const requestId = ++searchRequest;

    showNotice('');

    const photographer = normalizeSearch(query);

    const endpoint = photographer
        ? `/api/publicacoes?fotografo=${encodeURIComponent(photographer)}`
        : '/api/publicacoes';

    try {
        const rows = await api(endpoint);

        // Ignora respostas de pesquisas antigas
        if (requestId !== searchRequest) {
            return;
        }

        gallery.innerHTML = '';

        if (!Array.isArray(rows)) {
            showNotice('Resposta inválida do servidor.');
            return;
        }

        if (rows.length === 0) {
            const message = photographer
                ? 'Nenhuma fotografia encontrada para este fotógrafo.'
                : 'Nenhuma fotografia encontrada.';

            gallery.innerHTML =
                `<p class="empty">${message}</p>`;

            return;
        }

        rows.forEach((photo) => {
            createPhotoCard(photo);
        });

    } catch (error) {
        if (requestId !== searchRequest) {
            return;
        }

        gallery.innerHTML = '';

        if (error.status === 404) {
            showNotice('Fotógrafo não encontrado.');
        } else {
            showNotice(error.message);
        }
    }
}

// ============================================
// CRIAR CARTÃO DE FOTOGRAFIA
// ============================================

function createPhotoCard(photo) {
    const card = document.createElement('article');
    card.className = 'photo';

    // Área da fotografia
    const imageContainer = document.createElement('div');
    imageContainer.className = 'photo-image';

    const image = document.createElement('img');

    image.alt = photo.titulo || 'Fotografia';

    if (photo.imagem?.startsWith('/')) {
        image.src = photo.imagem;
    } else {
        image.src =
            '/assets/fotografias/' +
            encodeURIComponent(photo.imagem || '');
    }

    image.onerror = () => {
        image.alt = 'Imagem não encontrada';
        image.style.objectFit = 'contain';
    };

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';

    tooltip.textContent =
        `Foto tirada por: ${photo.fotografo} · Local: ${photo.local}`;

    imageContainer.append(image, tooltip);

    const info = document.createElement('div');
    info.className = 'photo-info';

    const description = document.createElement('div');

    const title = document.createElement('h3');
    title.textContent = photo.titulo;

    const photographer = document.createElement('small');
    photographer.textContent = 'Por ' + photo.fotografo;

    description.append(title, photographer);

    const likeButton = document.createElement('button');
    likeButton.type = 'button';
    likeButton.className = 'like';

    likeButton.setAttribute('aria-label', 'Curtir fotografia');

    const heart = document.createElement('img');
    heart.src = '/assets/icones/coracao.svg';
    heart.alt = 'Curtir';

    heart.style.filter = photo.curtida_por_mim
        ? 'invert(14%) sepia(99%) saturate(7480%) hue-rotate(1deg)'
        : 'none';

    const count = document.createElement('span');
    count.textContent = Number(photo.curtidas) || 0;

    likeButton.append(heart, count);

    likeButton.addEventListener('click', async () => {
        await toggleLike(photo.id, likeButton);
    });

    info.append(description, likeButton);

    card.append(imageContainer, info);

    gallery.append(card);
}


async function toggleLike(publicationId, button) {
    if (!currentUser) {
        openLogin();
        return;
    }

    button.disabled = true;

    try {
        await api(`/api/curtidas/${publicationId}`, {
            method: 'POST'
        });

        await loadPhotos(searchInput.value);

    } catch (error) {
        showNotice(error.message);

    } finally {
        button.disabled = false;
    }
}


searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        if (!currentUser) {
            openLogin();
            return;
        }

        loadPhotos(searchInput.value);
    }, 350);
});



$('#profileBtn').addEventListener('click', async () => {
    if (!currentUser) {
        openLogin();
        return;
    }

    if (currentUser.tipo !== 'fotografo') {
        return;
    }

    sidebar.classList.remove('hidden');

    $('#sideName').textContent = currentUser.nome;

    try {
        await loadStats();
        await loadMine();

    } catch (error) {
        showNotice(error.message);
    }
});


async function loadStats() {
    const stats = await api('/api/perfil');

    const totalLikes = Number(stats.likes) || 0;
    const totalPublications = Number(stats.publicacoes) || 0;

    $('#stats').textContent =
        `${totalLikes} Likes · ${totalPublications} Publicações`;
}


async function loadMine() {
    const rows = await api('/api/minhas-publicacoes');

    const list = $('#myList');

    list.innerHTML = '';

    const heading = document.createElement('h3');
    heading.textContent = 'Suas publicações';

    list.append(heading);

    if (!rows.length) {
        const empty = document.createElement('p');

        empty.textContent = 'Você ainda não possui publicações.';
        empty.className = 'empty';

        list.append(empty);
        return;
    }

    rows.forEach((photo) => {
        const item = document.createElement('div');
        item.className = 'my-item';

        const title = document.createElement('span');
        title.textContent = photo.titulo;

        const deleteButton = document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className = 'delete';
        deleteButton.title = 'Excluir publicação';
        deleteButton.setAttribute(
            'aria-label',
            'Excluir ' + photo.titulo
        );

        const trashIcon = document.createElement('img');

        trashIcon.src = '/assets/icones/lixeira.svg';
        trashIcon.alt = 'Excluir';

        trashIcon.style.width = '22px';
        trashIcon.style.height = '22px';
        trashIcon.style.filter =
            'invert(14%) sepia(99%) saturate(7480%) hue-rotate(1deg)';

        deleteButton.append(trashIcon);

        deleteButton.addEventListener('click', async () => {
            await deletePublication(photo.id);
        });

        item.append(title, deleteButton);

        list.append(item);
    });
}


async function deletePublication(id) {
    const confirmed = confirm(
        'Tem certeza que deseja excluir esta publicação?'
    );

    if (!confirmed) {
        return;
    }

    try {
        await api(`/api/publicacoes/${id}`, {
            method: 'DELETE'
        });

        await loadMine();

        await loadStats();

        await loadPhotos(searchInput.value);

        showNotice('Publicação excluída com sucesso!');

    } catch (error) {
        showNotice(error.message);
    }
}


$('#closeSide').addEventListener('click', () => {
    sidebar.classList.add('hidden');
});



$('#myPosts').addEventListener('click', async () => {
    try {
        await loadMine();

        $('#myList').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    } catch (error) {
        showNotice(error.message);
    }
});


$('#postForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUser || currentUser.tipo !== 'fotografo') {
        showNotice('Somente fotógrafos podem cadastrar fotografias.');
        return;
    }

    const form = event.currentTarget;

    const title = form.elements.titulo.value.trim();
    const local = form.elements.local.value.trim();
    const image = form.elements.imagem.files[0];

    if (!title) {
        alert('Informe o título da imagem.');
        return;
    }

    if (!local) {
        alert('Informe a fonte de origem.');
        return;
    }

    if (!image) {
        alert('Nenhum arquivo escolhido.');
        return;
    }

    const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    if (!validTypes.includes(image.type)) {
        alert('Formato inválido. Escolha JPG, JPEG, PNG, GIF ou WEBP.');
        return;
    }

    if (image.size > 8 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 8 MB.');
        return;
    }

    const formData = new FormData(form);

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = 'Cadastrando...';

    try {
        await api('/api/publicacoes', {
            method: 'POST',
            body: formData
        });

        form.reset();

        await loadMine();

        await loadStats();

        await loadPhotos(searchInput.value);

        showNotice('Fotografia cadastrada com sucesso!');

    } catch (error) {
        alert(error.message);

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Cadastrar';
    }
});

async function initializeApp() {
    try {
        await loadUser();

        await loadPhotos();

    } catch (error) {
        showNotice(
            'Não foi possível iniciar o SAEPVision. ' +
            error.message
        );
    }
}

initializeApp();
