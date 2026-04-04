// bu funksiya arxa fon ucun hereketli hissəcikler yaradir
(function initParticles() {
    const container = document.getElementById('bgParticles');
    const count = 35;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const duration = Math.random() * 12 + 8;
        const delay = Math.random() * 10;
        const hue = 240 + Math.random() * 40;

        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            background: hsl(${hue}, 80%, 70%);
            box-shadow: 0 0 ${size * 3}px hsl(${hue}, 80%, 60%);
        `;

        container.appendChild(particle);
    }
})();

// bu deyisken login formasini saxlayir
const form = document.getElementById('loginForm');
// bu deyisken email xanasini saxlayir
const emailInput = document.getElementById('email');
// bu deyisken sifre xanasini saxlayir
const passwordInput = document.getElementById('password');
// bu deyisken email qrupunu saxlayir
const emailGroup = document.getElementById('emailGroup');
// bu deyisken sifre qrupunu saxlayir
const passwordGroup = document.getElementById('passwordGroup');
// bu deyisken email xeta mesajini saxlayir
const emailError = document.getElementById('emailError');
// bu deyisken sifre xeta mesajini saxlayir
const passwordError = document.getElementById('passwordError');
// bu deyisken sifre gosterme duymesini saxlayir
const toggleBtn = document.getElementById('togglePassword');
// bu deyisken giris duymesini saxlayir
const loginBtn = document.getElementById('loginBtn');

// bu hissede sifreni gizletmek ve gosterme hereketi idare olunur
if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';

        const eyeOpen = toggleBtn.querySelector('.eye-open');
        const eyeClosed = toggleBtn.querySelector('.eye-closed');

        if (eyeOpen) eyeOpen.style.display = isPassword ? 'none' : 'block';
        if (eyeClosed) eyeClosed.style.display = isPassword ? 'block' : 'none';
    });
}

// bu funksiya email formasinin duzgun olub olmadigini yoxlayir
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// bu funksiya xeta mesajini ekrana cixarir
function showError(group, errorEl, message) {
    group.classList.add('error');
    errorEl.textContent = message;
}

// bu funksiya xeta mesajini temizleyir
function clearError(group, errorEl) {
    group.classList.remove('error');
    errorEl.textContent = '';
}

// bu hissede email xanasinin anliq yoxlanisi aparilir
if (emailInput && emailGroup && emailError) {
    emailInput.addEventListener('input', () => {
        if (emailInput.value && !isValidEmail(emailInput.value)) {
            showError(emailGroup, emailError, 'Please enter a valid email address');
        } else {
            clearError(emailGroup, emailError);
        }
    });
}

// bu hissede sifre xetasinin temizlenmesi idare olunur
if (passwordInput && passwordGroup && passwordError) {
    passwordInput.addEventListener('input', () => {
        clearError(passwordGroup, passwordError);
    });
}

// bu funksiya giris formasinin gonderilmesini idare edir
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!emailInput || !passwordInput || !loginBtn) return;

        let valid = true;

        if (!emailInput.value.trim()) {
            showError(emailGroup, emailError, 'Email is required');
            valid = false;
        } else if (!isValidEmail(emailInput.value)) {
            showError(emailGroup, emailError, 'Please enter a valid email address');
            valid = false;
        } else {
            clearError(emailGroup, emailError);
        }

        if (!passwordInput.value) {
            showError(passwordGroup, passwordError, 'Password is required');
            valid = false;
        } else if (passwordInput.value.length < 6) {
            showError(passwordGroup, passwordError, 'Password must be at least 6 characters');
            valid = false;
        } else {
            clearError(passwordGroup, passwordError);
        }

        if (!valid) return;

        // bu deyisken duymedeki metni saxlayir
        const btnText = loginBtn.querySelector('.btn-text');
        // bu deyisken duymedeki yuklenme gostergesini saxlayir
        const btnLoader = loginBtn.querySelector('.btn-loader');

        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'flex';
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.8';

        const loginData = {
            e_mail: emailInput.value,
            sifre: passwordInput.value
        };

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        })
            .then(response => response.json())
            .then(data => {
                if (btnText) btnText.style.display = 'inline';
                if (btnLoader) btnLoader.style.display = 'none';
                loginBtn.disabled = false;
                loginBtn.style.opacity = '1';

                if (data.success) {
                    sessionStorage.setItem('uni_forum_user', JSON.stringify(data.user));
                    showToast('Giriş uğurludur! Yönləndirilirsiniz...');
                    setTimeout(() => {
                        window.location.href = 'successful_login.html';
                    }, 1000);
                } else {
                    if (data.error === 'E-mail və ya şifrə səhvdir') {
                        showToast('Belə bir istifadəçi tapılmadı. Zəhmət olmasa Qeydiyyatdan (Sign Up) keçin.');
                    } else {
                        showToast('Xəta: ' + (data.error || 'Server xətası'));
                    }
                }
            })
            .catch(error => {
                console.error('Xəta baş verdi:', error);
                if (btnText) btnText.style.display = 'inline';
                if (btnLoader) btnLoader.style.display = 'none';
                loginBtn.disabled = false;
                loginBtn.style.opacity = '1';
                showToast('Bağlantı xətası: Serverə qoşulmaq olmur!');
            });
    });
}

// bu funksiya qisa bildiris penceresi gosterir
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.classList.add('toast');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
