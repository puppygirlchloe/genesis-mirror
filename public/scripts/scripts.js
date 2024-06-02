document.addEventListener("DOMContentLoaded", function() {
    const socket = io();

    const notificationSound = new Audio('./assets/sounds/notification.mp3')

    let lastNotificationTime = 0;

    function playNotificationSound() {
        const currentTime = Date.now();

        if (currentTime - lastNotificationTime >= 5000) {
            notificationSound.currentTime = 0;
            notificationSound.play();
            lastNotificationTime = currentTime;
        }
    }

    function terminate() {
        fetch('/terminate')
            .then(response => {
                if (response.ok) {
                    console.log('Server termination request sent.');
                } else {
                    console.error('Failed to terminate server.');
                }
            })
            .catch(error => {
                console.error('Error sending termination request:', error);
            });
    }

    function applyGradientFromJSON() {
        fetch('../config/information.json')
            .then(response => response.json())
            .then(data => {
                const account = data.account;
                const serverIP = data.connect_to;

                const playerListItems = document.querySelectorAll('#playerList li');
                playerListItems.forEach(item => {
                    if (item.textContent.trim() === account) {
                        item.classList.add('myname');
                    } else {
                        item.classList.remove('myname');
                    }
                });

                document.getElementById('serverIP').textContent = serverIP;

                fetchPlayerHead(account);
            })
            .catch(error => {
                console.error('Error fetching or parsing information.json:', error);
            });
    }

    applyGradientFromJSON();

    function populatePlayerList(playerList) {
        const playerListElement = document.getElementById('playerList');
        playerListElement.innerHTML = '';

        const players = playerList.split(', ').map(player => player.trim());

        players.forEach(player => {
            const playerItem = document.createElement('li');
            playerItem.textContent = player;
            playerListElement.appendChild(playerItem);
        });

        applyGradientFromJSON();

        const playerCountElement = document.getElementById('playerCount');
        const currentTime = new Date().toLocaleTimeString();
        playerCountElement.textContent = `${players.length} player(s) online @ ${currentTime}`;
    }

    socket.on('newMessage', (message) => {
        const chatBox = document.getElementById('chatBox');
        const newMessage = document.createElement('div');
        newMessage.textContent = message;
        chatBox.appendChild(newMessage);

        playNotificationSound();

        chatBox.scrollTop = chatBox.scrollHeight;
    });

    socket.on('updatePlayerList', populatePlayerList);

    function sendMessage() {
        const messageInput = document.getElementById('messageInput').value;
        if (messageInput.trim() !== '') {
            socket.emit('sendMessage', messageInput);
            document.getElementById('messageInput').value = '';
        }
    }

    document.getElementById('messageInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function togglePlayerBlock() {
        const playerBlock = document.querySelector('.playerBlock');
        playerBlock.style.height = playerBlock.scrollHeight + 'px';
        playerBlock.classList.toggle('expanded');
    }

    function fetchPlayerHead(account) {
        fetch('./assets/heads/players.json')
            .then(response => response.json())
            .then(playerData => {
                if (playerData.hasOwnProperty(account)) {
                    const headUrl = playerData[account];
                    document.getElementById('currentAccountText').innerHTML = `Welcome back, <strong>${account}</strong>.`;
                    document.getElementById('playerHead').src = headUrl;
                } else {
                    console.log(`Player head not found for account: ${account}`);
                }
            })
            .catch(error => {
                console.error('Error fetching player head:', error);
            });
    }
});
