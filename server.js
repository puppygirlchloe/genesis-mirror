const mcapi = require("minecraft-search");
const express = require('express');
const http = require('http');
const mineflayer = require('mineflayer');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const headsDirectory = './public/assets/heads';

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let bot;
let startTime = Date.now();
const { connect_to, account } = require('./public/config/information.json')
function createBot() {
    bot = mineflayer.createBot({
        host: connect_to,
        auth: "microsoft",
    });

    bot.once('login', () => {
        console.log('[ ' + "Genesis Mirror" + ' ] ' + account + ' logged in');
    });

    bot.on('error', (err) => {
        console.error('[ ' + "Genesis Mirror" + ' ]' + ' Bot error:', err);
        setTimeout(createBot, 5000);
    });

    bot.on('end', () => {
        console.log('[ ' + "Genesis Mirror" + ' ]' +' Bot disconnected');
        setTimeout(createBot, 5000);
    });

    bot.on('kicked', (reason) => {
        console.log('[ ' + "Genesis Mirror" + ' ]' + ' Bot kicked:', reason);
    });

    bot.on('chat', (username, message) => {
        if (username === account) { 
            return;
        } else {
            const formattedMessage = `${username}: ${message}`;
            updateRecentMessages(formattedMessage);
            io.emit('newMessage', formattedMessage);
        }
    });
    
    const headsPath = './public/assets/heads/players.json';

    bot.on('login', () => {
        setInterval(() => {
                const playerList = Object.keys(bot.players).join(", ");
                io.emit('updatePlayerList', playerList);
            }, 1000);
        mcapi.head(account).then(head => {
                const headUrl = head.helmavatar;
                const playerHeadData = {};
                playerHeadData[account] = headUrl;
    
                fs.writeFileSync(headsPath, JSON.stringify(playerHeadData));
                console.log('[ ' + "Genesis Mirror" + ' ]' + ' Player head saved to players.json:', headUrl);
            }).catch(err => {
                console.error('[ ' + "Genesis Mirror" + ' ]' + ' Error capturing player head:', err);
            });
        });
    }
    
createBot();

const recentMessages = [];
const MAX_MESSAGES = 10;

function updateRecentMessages(message) {
    recentMessages.push(message);
    if (recentMessages.length > MAX_MESSAGES) {
        recentMessages.shift();
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/recent-messages', (req, res) => {
    res.json({ messages: recentMessages });
});

app.post('/send-message', (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const parsedBody = JSON.parse(body);
        const message = parsedBody.message;
        if (bot) {
            bot.chat(message);
            updateRecentMessages(`You: ${message}`);
            io.emit('newMessage', `You: ${message}`);
        }
        res.end();
    });
});

const port = process.env.PORT || 1337;

io.on('connection', (socket) => {
    console.log('[ ' + "Genesis Mirror" + ' ]' + ' A user connected');
    socket.emit('recentMessages', recentMessages);

    socket.on('sendMessage', (message) => {
        if (bot) {
            bot.chat(message);
            updateRecentMessages(`You: ${message}`); 
            io.emit('newMessage', `You: ${message}`);
        }
    });
});

server.listen(port, () => {
    console.log('[ ' + "Genesis Mirror" + ' ]' + ` Server running at http://localhost:${port}/`);
});

if (!fs.existsSync(headsDirectory)) {
    fs.mkdirSync(headsDirectory);
}

