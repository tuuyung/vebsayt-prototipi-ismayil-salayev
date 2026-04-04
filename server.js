const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
app.use(helmet());

const port = Number.parseInt(process.env.PORT, 10) || 3000;
const appHost = process.env.APP_HOST || '127.0.0.1';
const bcryptSaltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number.parseInt(process.env.DB_PORT, 10)
});

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

pool.connect()
    .then(() => console.log('✅ PostgreSQL bazasına uğurla qoşuldu'))
    .catch(err => console.error('❌ Bağlantı xətası:', err.stack));

app.post('/api/signup', async (req, res) => {
    const { e_mail, ad = null, soyad = null, ixtisas = null, sifre } = req.body;

    if (!e_mail || !sifre) {
        return res.status(400).json({ error: 'Email və şifrə mütləqdir!' });
    }

    try {
        const hashedPassword = await bcrypt.hash(sifre, bcryptSaltRounds);
        const insertQuery = `
            INSERT INTO public.login (e_mail, ad, soyad, ixtisas, sifre)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const values = [normalizeEmail(e_mail), ad, soyad, ixtisas, hashedPassword];
        const result = await pool.query(insertQuery, values);

        res.status(201).json({
            success: true,
            message: 'Məlumat bazaya uğurla əlavə edildi',
            userId: result.rows[0].id
        });
    } catch (err) {
        console.error('Bazaya yazılma xətası baş verdi:', err.stack);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: 'Bu email artıq qeydiyyatdan keçib' });
        }
        res.status(500).json({ success: false, error: 'Daxili server xətası baş verdi' });
    }
});

app.post('/api/login', async (req, res) => {
    const { e_mail, sifre } = req.body;

    if (!e_mail || !sifre) {
        return res.status(400).json({ success: false, error: 'Email və şifrə mütləqdir!' });
    }

    try {
        const checkQuery = `SELECT id, ad, soyad, ixtisas, sifre FROM public.login WHERE e_mail = $1`;
        const result = await pool.query(checkQuery, [normalizeEmail(e_mail)]);

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

            // Köhnə plain-text parolları uğurlu girişdən sonra hash formatına yüksəlt.
            const upgradedPassword = await bcrypt.hash(sifre, bcryptSaltRounds);
            await pool.query('UPDATE public.login SET sifre = $1 WHERE id = $2', [upgradedPassword, user.id]);
        }

        if (!passwordMatches) {
            res.status(401).json({ success: false, error: 'E-mail və ya şifrə səhvdir' });
            return;
        }

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


app.listen(port, appHost, () => {
  console.log(`Backend http://${appHost}:${port} adresində işləyir...`);
});
