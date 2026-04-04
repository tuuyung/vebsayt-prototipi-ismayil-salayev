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

// bu deyisken qeydiyyat formasini saxlayir
const signupForm = document.getElementById('signupForm');
// bu deyisken ad xanasini saxlayir
const regAd = document.getElementById('regAd');
// bu deyisken soyad xanasini saxlayir
const regSoyad = document.getElementById('regSoyad');
// bu deyisken ixtisas xanasini saxlayir
const regIxtisas = document.getElementById('regIxtisas');
// bu deyisken email xanasini saxlayir
const regEmail = document.getElementById('regEmail');
// bu deyisken sifre xanasini saxlayir
const regPassword = document.getElementById('regPassword');
// bu deyisken ad qrupunu saxlayir
const regAdGroup = document.getElementById('regAdGroup');
// bu deyisken soyad qrupunu saxlayir
const regSoyadGroup = document.getElementById('regSoyadGroup');
// bu deyisken ixtisas qrupunu saxlayir
const regIxtisasGroup = document.getElementById('regIxtisasGroup');
// bu deyisken email qrupunu saxlayir
const regEmailGroup = document.getElementById('regEmailGroup');
// bu deyisken sifre qrupunu saxlayir
const regPasswordGroup = document.getElementById('regPasswordGroup');
// bu deyisken qeydiyyat duymesini saxlayir
const signupBtn = document.getElementById('signupBtn');

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

// bu funksiya qeydiyyat formasinin gonderilmesini idare edir
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;

    if (!regAd.value.trim()) { showError(regAdGroup, document.getElementById('regAdError'), 'Ad is required'); valid = false; } else { clearError(regAdGroup, document.getElementById('regAdError')); }
    if (!regSoyad.value.trim()) { showError(regSoyadGroup, document.getElementById('regSoyadError'), 'Soyad is required'); valid = false; } else { clearError(regSoyadGroup, document.getElementById('regSoyadError')); }
    if (!regIxtisas.value.trim()) { showError(regIxtisasGroup, document.getElementById('regIxtisasError'), 'İxtisas is required'); valid = false; } else { clearError(regIxtisasGroup, document.getElementById('regIxtisasError')); }

    if (!regEmail.value.trim()) { showError(regEmailGroup, document.getElementById('regEmailError'), 'Email is required'); valid = false; }
    else if (!isValidEmail(regEmail.value)) { showError(regEmailGroup, document.getElementById('regEmailError'), 'Enter a valid email'); valid = false; }
    else { clearError(regEmailGroup, document.getElementById('regEmailError')); }

    if (!regPassword.value) { showError(regPasswordGroup, document.getElementById('regPasswordError'), 'Password is required'); valid = false; }
    else if (regPassword.value.length < 6) { showError(regPasswordGroup, document.getElementById('regPasswordError'), 'Minimum 6 chars'); valid = false; }
    else { clearError(regPasswordGroup, document.getElementById('regPasswordError')); }

    if (!valid) return;

    // bu deyisken duymedeki metni saxlayir
    const btnText = signupBtn.querySelector('.btn-text');
    // bu deyisken duymedeki yuklenme gostergesini saxlayir
    const btnLoader = signupBtn.querySelector('.btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    signupBtn.disabled = true;
    signupBtn.style.opacity = '0.8';

    const signupData = {
        ad: regAd.value,
        soyad: regSoyad.value,
        ixtisas: regIxtisas.value,
        e_mail: regEmail.value,
        sifre: regPassword.value
    };

    fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
    })
        .then(response => response.json())
        .then(data => {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            signupBtn.disabled = false;
            signupBtn.style.opacity = '1';

            if (data.success) {
                showToast('Hesab uğurla yaradıldı! Giriş səhifəsinə yönləndirilirsiniz...');
                signupForm.reset();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showToast('Xəta: ' + (data.error || 'Server xətası'));
            }
        })
        .catch(error => {
            console.error('Xəta baş verdi:', error);
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            signupBtn.disabled = false;
            signupBtn.style.opacity = '1';
            showToast('Bağlantı xətası: Serverə qoşulmaq olmur!');
        });
});
