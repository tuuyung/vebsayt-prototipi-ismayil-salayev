// bu hissede server ucun lazim olan modullar yuklenir
const express = require('express');
const { isIP } = require('node:net');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const helmet = require('helmet')
require('dotenv').config();

// bu hissede express tetbiqi yaradilir
const app = express();
app.use(helmet())

// bu deyiskenler serverin esas ayarlarini saxlayir
const port = Number.parseInt(process.env.PORT, 10) || 3000;
const appHost = process.env.APP_HOST || '127.0.0.1';
const bcryptSaltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

// bu hissede gelen sorgular ucun ortaq middlewareler qosulur
app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// bu obyekt postgresql bazasi ile baglantini idare edir
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number.parseInt(process.env.DB_PORT, 10)
});

// bu funksiya emaili eyni formaya salir
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

// bu funksiya sifrenin hash formatinda olub olmadigini yoxlayir
function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

// bu funksiya ip unvanini standart gorunuse salib qaytarir
function normalizeIpAddress(rawIpAddress) {
    if (typeof rawIpAddress !== 'string' || rawIpAddress.trim() === '') {
        return null;
    }

    const normalizedIpAddress = rawIpAddress.trim().replace(/^::ffff:/, '');
    return isIP(normalizedIpAddress) ? normalizedIpAddress : null;
}

// bu funksiya ip unvaninin private ve ya lokal olub olmadigini yoxlayir
function isPrivateIpAddress(ipAddress) {
    if (!ipAddress) {
        return false;
    }

    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
        return true;
    }

    if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
        return true;
    }

    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress)) {
        return true;
    }

    return ipAddress.startsWith('fc')
        || ipAddress.startsWith('fd')
        || ipAddress.startsWith('fe80:');
}

// bu funksiya sorgudan gelen public ip unvanini tapib qaytarir
function getClientIpAddress(req) {
    const headerCandidates = [
        req.headers['cf-connecting-ip'],
        req.headers['x-real-ip'],
        req.headers['x-forwarded-for'],
        req.ip,
        req.socket?.remoteAddress
    ];

    const parsedIpAddresses = headerCandidates
        .flatMap(value => typeof value === 'string' ? value.split(',') : [])
        .map(value => normalizeIpAddress(value))
        .filter(Boolean);

    const publicIpAddress = parsedIpAddresses.find(ipAddress => !isPrivateIpAddress(ipAddress));
    if (publicIpAddress) {
        return publicIpAddress;
    }

    if (parsedIpAddresses.length === 0) {
        return null;
    }

    return parsedIpAddresses[0];
}

// bu funksiya activity cedveline login ve qeydiyyat loglarini yazir
async function insertActivityLog(db, loginId, actionType, ipAddress) {
    const insertLogQuery = `
        INSERT INTO public.activity (login_id, action_type, logged_at_time, logged_at_date, ip_address)
        VALUES ($1, $2, CURRENT_TIME, CURRENT_DATE, $3);
    `;

    await db.query(insertLogQuery, [loginId, actionType, ipAddress]);
}

// bu hissede baza baglantisinin acildigi yoxlanilir
pool.query('SELECT 1')
    .then(() => console.log('PostgreSQL bazasına uğurla qoşuldu'))
    .catch(err => console.error('Bağlantı xətası:', err.stack));

// bu funksiya yeni istifadecini qeydiyyata alir
app.post('/api/signup', async (req, res) => {
    const { e_mail, ad = null, soyad = null, ixtisas = null, sifre } = req.body;
    const normalizedEmail = normalizeEmail(e_mail || '');
    const clientIpAddress = getClientIpAddress(req);

    if (!e_mail || !sifre) {
        return res.status(400).json({ error: 'Email və şifrə mütləqdir!' });
    }

    let client;
    try {
        const hashedPassword = await bcrypt.hash(sifre, bcryptSaltRounds);
        client = await pool.connect();
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO public.login (e_mail, ad, soyad, ixtisas, sifre)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const values = [normalizedEmail, ad, soyad, ixtisas, hashedPassword];
        const result = await client.query(insertQuery, values);
        const userId = result.rows[0].id;

        await insertActivityLog(client, userId, 'signup', clientIpAddress);
        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Məlumat bazaya uğurla əlavə edildi',
            userId
        });
    } catch (err) {
        if (client) {
            await client.query('ROLLBACK').catch(() => null);
        }

        console.error('Bazaya yazılma xətası baş verdi:', err.stack);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: 'Bu email artıq qeydiyyatdan keçib' });
        }
        res.status(500).json({ success: false, error: 'Daxili server xətası baş verdi' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// bu funksiya istifadecinin giris melumatlarini yoxlayir
app.post('/api/login', async (req, res) => {
    const { e_mail, sifre } = req.body;
    const normalizedEmail = normalizeEmail(e_mail || '');
    const clientIpAddress = getClientIpAddress(req);

    if (!e_mail || !sifre) {
        return res.status(400).json({ success: false, error: 'Email və şifrə mütləqdir!' });
    }

    try {
        const checkQuery = `SELECT id, ad, soyad, ixtisas, sifre FROM public.login WHERE e_mail = $1`;
        const result = await pool.query(checkQuery, [normalizedEmail]);

        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'E-mail və ya şifrə səhvdir' });
            return;
        }

        const user = result.rows[0];
        let passwordMatches = false;

        if (isBcryptHash(user.sifre)) {
            passwordMatches = await bcrypt.compare(sifre, user.sifre);
        } else if (user.sifre === sifre) {
            passwordMatches = true;
        }

        if (!passwordMatches) {
            res.status(401).json({ success: false, error: 'E-mail və ya şifrə səhvdir' });
            return;
        }

        await insertActivityLog(pool, user.id, 'login', clientIpAddress);

        res.status(200).json({
            success: true,
            message: 'Giriş uğurludur',
            user: {
                id: user.id,
                ad: user.ad,
                soyad: user.soyad,
                ixtisas: user.ixtisas
            }
        });
    } catch (err) {
        console.error('Login yoxlama xətası:', err.stack);
        res.status(500).json({ success: false, error: 'Daxili server xətası baş verdi' });
    }
});


// bu hissede server gelen sorulari dinlemeye baslayir
app.listen(port, appHost, () => {
  console.log(`Backend http://${appHost}:${port} adresində işləyir...`);
});
