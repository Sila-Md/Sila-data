const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files from root

// Session
app.use(session({
    secret: 'sila_wa_bun_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://sila_md:sila0022@sila.67mxtd7.mongodb.net/sila_wa_bun?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
    initializeData();
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// ============= SCHEMAS =============
const messageSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    category: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const visitorSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    ip: String,
    userAgent: String,
    language: String,
    screenSize: String,
    referrer: String,
    location: {
        country: String,
        city: String,
        region: String
    },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    visitCount: { type: Number, default: 1 },
    pages: [String]
});

const Message = mongoose.model('Message', messageSchema);
const Visitor = mongoose.model('Visitor', visitorSchema);

// ============= INITIALIZE DEFAULT MESSAGES =============
async function initializeData() {
    const defaultMessages = [
        // Main WhatsApp emails
        { email: 'support@whatsapp.com', category: 'general', content: 'I am reporting a WhatsApp scammer/hacker. The suspect\'s number is [TARGET_NUMBER]. They are involved in fraudulent activities including fake promises, money requests, and account takeover attempts. I have screenshots and evidence attached. This needs immediate investigation.' },
        
        { email: 'security@whatsapp.com', category: 'security', content: 'URGENT SECURITY THREAT: A user with number [TARGET_NUMBER] is actively attempting to hack WhatsApp accounts. They send phishing links claiming "WhatsApp Web Login Required" and use social engineering to trick victims into revealing OTP codes. Multiple users have reported compromised accounts from this same number.' },
        
        { email: 'appeals@support.whatsapp.com', category: 'general', content: 'APPEAL FOR HACKED ACCOUNT RECOVERY: My WhatsApp account was compromised by [TARGET_NUMBER]. They used a SIM swap attack and changed my two-step verification PIN. I need urgent assistance to recover my account as they are impersonating me and scamming my contacts.' },
        
        { email: 'android_web@support.whatsapp.com', category: 'security', content: 'ANDROID MALWARE REPORT: The number [TARGET_NUMBER] is distributing malicious APK files disguised as "WhatsApp Gold" and "WhatsApp Plus". These files contain spyware that steals contacts, messages, and photos from infected devices. This is a widespread Android security threat.' },
        
        { email: 'ios_web@support.whatsapp.com', category: 'security', content: 'iOS PHISHING ATTACK: [TARGET_NUMBER] sends messages claiming "Your iCloud is linked to another device" with fake Apple login pages. When victims enter credentials, they gain access to Apple IDs and WhatsApp backups. This is a sophisticated attack targeting iPhone users.' },
        
        { email: 'webclient_web@support.whatsapp.com', category: 'security', content: 'WHATSAPP WEB BOT SCAM: The user [TARGET_NUMBER] is using automated bots on WhatsApp Web to send mass scam messages. They claim to offer "free money" and "government grants" but collect personal information and banking details from victims.' },
        
        { email: 'businesscomplaints@support.whatsapp.com', category: 'business', content: 'BUSINESS ACCOUNT IMPERSONATION: A fake business using number [TARGET_NUMBER] is pretending to be a legitimate company. They take payments for products/services that never get delivered. They have scammed over 50 customers and damaged the reputation of real businesses.' },
        
        { email: 'help@whatsapp.com', category: 'general', content: 'EMERGENCY ASSISTANCE: I have been scammed by [TARGET_NUMBER]. They promised to double my money through an "investment opportunity" and I sent them 500,000 TZS via mobile money. Immediately after payment, they blocked me. Please help trace this account.' },
        
        { email: 'abuse@support.whatsapp.com', category: 'abuse', content: 'HARASSMENT AND BLACKMAIL REPORT: [TARGET_NUMBER] has been sending death threats, sharing my private photos without consent, and attempting to extort money from me. They threaten to leak intimate photos to my family and employer if I don\'t pay. This is causing severe emotional distress.' },
        
        // Additional emails
        { email: 'lawenforcement@support.whatsapp.com', category: 'legal', content: 'LAW ENFORCEMENT REFERRAL - CYBERCRIME INVESTIGATION: The individual using WhatsApp number [TARGET_NUMBER] is part of an organized cybercrime syndicate. They have defrauded over 200 victims totaling approximately $50,000. We request immediate preservation of all account records, IP logs, and transaction data for criminal prosecution.' },
        
        { email: 'press@whatsapp.com', category: 'general', content: 'MEDIA INQUIRY - SCAM INVESTIGATION: I am an investigative journalist documenting the rise of WhatsApp scams in East Africa. The number [TARGET_NUMBER] is connected to a large-scale fraud operation. I am requesting information about this account for a story on WhatsApp security and user protection.' },
        
        { email: 'phishing@whatsapp.com', category: 'security', content: 'MASSIVE PHISHING CAMPAIGN DETECTED: [TARGET_NUMBER] is orchestrating a large-scale phishing operation. They send messages saying "Your WhatsApp will expire in 24 hours" with links to fake login pages. Once victims enter credentials, their accounts are immediately hijacked and used to scam their contacts.' },
        
        { email: 'legal@whatsapp.com', category: 'legal', content: 'LEGAL NOTICE AND EVIDENCE PRESERVATION: I am filing a lawsuit against the scammer using number [TARGET_NUMBER]. I request that you preserve all account information including registration date, IP addresses, device info, and message logs. This evidence is critical for court proceedings.' }
    ];

    for (const msg of defaultMessages) {
        const exists = await Message.findOne({ email: msg.email });
        if (!exists) {
            await Message.create(msg);
            console.log(`📧 Created: ${msg.email}`);
        }
    }
    
    // Set default admin PIN if not exists
    const adminCollection = mongoose.connection.collection('admins');
    const admin = await adminCollection.findOne({ username: 'admin' });
    if (!admin) {
        const hashedPin = await bcrypt.hash('sila0022', 10);
        await adminCollection.insertOne({
            username: 'admin',
            pin: hashedPin,
            createdAt: new Date()
        });
        console.log('🔐 Default admin PIN created: sila0022');
    }
    
    console.log('✅ System initialized');
}

// ============= MIDDLEWARE =============
const requireAdmin = async (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// ============= API ROUTES =============

// Track visitor
app.post('/api/track', async (req, res) => {
    try {
        const { sessionId, userAgent, language, screenSize, referrer, ip, page } = req.body;
        
        // Get location from IP
        let location = {};
        try {
            const ipRes = await axios.get(`http://ip-api.com/json/${ip}`);
            if (ipRes.data.status === 'success') {
                location = {
                    country: ipRes.data.country,
                    city: ipRes.data.city,
                    region: ipRes.data.regionName
                };
            }
        } catch (e) {}

        let visitor = await Visitor.findOne({ sessionId });
        
        if (visitor) {
            visitor.lastVisit = new Date();
            visitor.visitCount += 1;
            if (!visitor.pages.includes(page)) {
                visitor.pages.push(page);
            }
            await visitor.save();
        } else {
            visitor = await Visitor.create({
                sessionId,
                ip,
                userAgent,
                language,
                screenSize,
                referrer,
                location,
                pages: [page]
            });
        }
        
        res.json({ success: true, visitorId: visitor._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all emails (public)
app.get('/api/emails', async (req, res) => {
    try {
        const messages = await Message.find({}).select('email category -_id');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get message for specific email (public - used by modal)
app.post('/api/message', async (req, res) => {
    try {
        const { email } = req.body;
        const message = await Message.findOne({ email });
        if (message) {
            res.json({ content: message.content });
        } else {
            res.json({ content: 'Report scammer number: [TARGET_NUMBER]' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ADMIN API ROUTES =============

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { pin } = req.body;
        const adminCollection = mongoose.connection.collection('admins');
        const admin = await adminCollection.findOne({ username: 'admin' });
        
        if (admin && await bcrypt.compare(pin, admin.pin)) {
            req.session.isAdmin = true;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid PIN' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check admin session
app.get('/api/admin/check', (req, res) => {
    res.json({ isAdmin: req.session.isAdmin || false });
});

// Get all messages (admin only)
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
        const messages = await Message.find({}).sort({ email: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update message (admin only)
app.put('/api/admin/messages/:email', requireAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        const { content } = req.body;
        
        const message = await Message.findOneAndUpdate(
            { email },
            { content, updatedAt: new Date() },
            { new: true }
        );
        
        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get visitors (admin only)
app.get('/api/admin/visitors', requireAdmin, async (req, res) => {
    try {
        const visitors = await Visitor.find({})
            .sort({ lastVisit: -1 })
            .limit(100);
        res.json(visitors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get visitor stats (admin only)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalVisitors = await Visitor.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayVisitors = await Visitor.countDocuments({
            lastVisit: { $gte: today }
        });
        
        const uniqueCountries = await Visitor.distinct('location.country');
        
        res.json({
            totalVisitors,
            todayVisitors,
            uniqueCountries: uniqueCountries.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change admin PIN
app.post('/api/admin/change-pin', requireAdmin, async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        const adminCollection = mongoose.connection.collection('admins');
        const admin = await adminCollection.findOne({ username: 'admin' });
        
        if (admin && await bcrypt.compare(currentPin, admin.pin)) {
            const hashedNewPin = await bcrypt.hash(newPin, 10);
            await adminCollection.updateOne(
                { username: 'admin' },
                { $set: { pin: hashedNewPin, updatedAt: new Date() } }
            );
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Current PIN is incorrect' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= SERVE HTML FILES =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
});