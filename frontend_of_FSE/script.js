// ===== CONSTANTS AND GLOBALS =====
const API_BASE_URL = "http://localhost:5000/api";
let currentSection = 'dashboard';
let currentCategoryFilter = 'all';
let selectedFile = null;

// ===== AUTHENTICATION =====
document.addEventListener("DOMContentLoaded", function() {
    initializeAuth();
    initializeFileUpload();
    initializeDashboard();
    initializeAvatarUpload();
});

function initializeAuth() {
    const loginForm = document.querySelector("form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.querySelector("input[type='email']").value;
    const password = document.querySelector("input[type='password']").value;
    
    // Validation
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
        return showAlert("Please enter a valid Gmail address.", "error");
    }
    if (password.length < 8) {
        return showAlert("Password must be at least 8 characters long.", "error");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || "Login failed");
        
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", email);
        showAlert("Login Successful!", "success");
        window.location.href = "dashboard.html";
    } catch (err) {
        showAlert(`Login failed: ${err.message}`, "error");
    }
}

// ===== FILE MANAGEMENT =====
function initializeFileUpload() {
    // Regular upload
    document.querySelector('.upload-btn')?.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    // Drag and drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            dropZone.addEventListener(event, preventDefaults);
        });
        
        ['dragenter', 'dragover'].forEach(event => {
            dropZone.addEventListener(event, () => dropZone.classList.add('highlight'));
        });
        
        ['dragleave', 'drop'].forEach(event => {
            dropZone.addEventListener(event, () => dropZone.classList.remove('highlight'));
        });
        
        dropZone.addEventListener('drop', handleDrop);
    }
    
    // Category filtering
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadFiles(btn.dataset.category);
        });
    });
}

async function uploadFile(category) {
    if (!selectedFile) {
        return showAlert('Please select a file first!', 'error');
    }

    try {
        showAlert(`Uploading ${selectedFile.name}...`, 'info');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', category);

        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: { 'x-auth-token': localStorage.getItem('token') },
            body: formData
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
        
        showAlert(`${selectedFile.name} uploaded to ${category}!`, 'success');
        document.getElementById('fileInput').value = '';
        selectedFile = null;
        loadFiles();
    } catch (err) {
        showAlert(`Upload error: ${err.message}`, 'error');
    }
}

async function loadFiles(category = 'all') {
    try {
        const url = `${API_BASE_URL}/files/list${category !== 'all' ? `?category=${category}` : ''}`;
        const response = await fetch(url, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        
        const files = await response.json();
        if (!response.ok) throw new Error(files.error || 'Failed to load files');
        
        renderFiles(files);
        updateFileCounts(files);
    } catch (err) {
        showAlert(`Error loading files: ${err.message}`, 'error');
    }
}

function renderFiles(files) {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;
    
    filesList.innerHTML = files.map(file => `
        <tr>
            <td>
                <i class="${getFileIcon(getFileType(file.filename))}"></i> 
                ${file.filename}
                ${file.category ? `<span class="file-category ${file.category}">${file.category}</span>` : ''}
            </td>
            <td>${getFileType(file.filename)}</td>
            <td>${formatFileSize(file.size || 0)}</td>
            <td>${new Date(file.updatedAt || file.createdAt).toLocaleString()}</td>
            <td class="actions">
                <button class="btn-download" onclick="downloadFile('${file._id}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-share" onclick="shareFile('${file._id}')">
                    <i class="fas fa-share"></i>
                </button>
                <button class="btn-delete" onclick="deleteFile('${file._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("user");
    
    if (!token && window.location.pathname.includes('dashboard.html')) {
        window.location.href = "index.html";
    }
    
    if (userEmail) {
        document.getElementById("user-email").textContent = userEmail;
        document.getElementById("username").textContent = userEmail.split('@')[0];
        document.getElementById("welcome-text").textContent = `Welcome back, ${userEmail.split('@')[0]}!`;
    }
    
    // Menu navigation
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.innerText.toLowerCase());
        });
    });
    
    if (localStorage.getItem('role') === 'admin') {
        document.getElementById('adminPanel').style.display = 'block';
        loadPendingRequests();
    }
}

// ===== AVATAR UPLOAD =====
function initializeAvatarUpload() {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) displayAvatar(savedAvatar);
    
    document.getElementById('avatar-upload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                localStorage.setItem('userAvatar', event.target.result);
                displayAvatar(event.target.result);
                uploadAvatarToServer(file);
            };
            reader.readAsDataURL(file);
        }
    });
}

function displayAvatar(imageData) {
    const avatarIcon = document.getElementById('avatar-icon');
    const avatarImage = document.getElementById('avatar-image');
    
    if (avatarIcon) avatarIcon.style.display = 'none';
    if (avatarImage) {
        avatarImage.style.display = 'block';
        avatarImage.src = imageData;
        avatarImage.alt = "User profile picture";
    }
}

// ===== HELPER FUNCTIONS =====
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// Keep your existing helper functions:
// getFileType(), getFileIcon(), formatFileSize(), etc.