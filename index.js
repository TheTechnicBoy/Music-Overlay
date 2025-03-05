const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// WebSocket-Server auf Port 8080
const wsPort = 8080;
const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket-Server läuft auf Port ${wsPort}`);

// This input has no functionallity, only for console output
const ip = "192.168.2.153";

// Express-Server auf Port 3000
const app = express();
app.use(express.json());
const expressPort = 3000;

// Globale Variablen zur Steuerung der Wiedergabe
let state = 'stopped';  // Mögliche Werte: 'playing', 'paused', 'stopped'
let startTime = 0;      // Zeitpunkt (in ms), an dem play/resume gestartet wurde
let pausedAt = 0;       // Abspielposition in Sekunden, wenn pausiert wurde
let audioUrl = '';
let imageUrl = '';
let songName = '';
let singerName = '';

function sendPacket(){
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          let message;
          if (state === 'playing') {
            // Berechne die aktuelle Abspielposition in Sekunden
            const currentTime = (Date.now() - startTime) / 1000;
            message = {
              action: 'play',
              audio_url: audioUrl,
              currentTime: currentTime,
              image_url: imageUrl,
              song_name: songName,
              singer_name: singerName
            };
          } else if (state === 'paused') {
            message = {
              action: 'pause',
              audio_url: audioUrl,
              pausedAt: pausedAt,
              image_url: imageUrl,
              song_name: songName,
              singer_name: singerName
            };
          } else if (state === 'stopped') {
            message = {
              action: 'stop',
              audio_url: audioUrl,
              image_url: imageUrl,
              song_name: songName,
              singer_name: singerName
            };
          }
          client.send(JSON.stringify(message));
        }
      });
}
setInterval(() => {
    sendPacket();
}, 100);

// Funktion, um ein neues Audio zu starten
function playAudio(url, imgUrl, song, singer) {
  audioUrl = url;
  imageUrl = imgUrl;
  songName = song;
  singerName = singer;
  startTime = Date.now();
  state = 'playing';
  pausedAt = 0;
}


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/:filename.mp3', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, `${filename}.mp3`);
  res.sendFile(filePath);
});
app.get('/ttb.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'ttb.png'));
});

app.post('/play', (req, res) => {
    const { file, img, song, singer } = req.body;
    if (!file) {
        return res.status(400).send('file is required.');
    }
    const url = file;
    const imgUrl = img || '';
    const songName = song || 'Unbekannter Song';
    const singerName = singer || 'Unbekannter Sänger';
    playAudio(url, imgUrl, songName, singerName);
    res.send(`Playing ${url}<br>Song: ${songName} - ${singerName}`);
    sendPacket();	

});


app.post('/pause', (req, res) => {
  if (state === 'playing') {
    pausedAt = (Date.now() - startTime) / 1000;
    state = 'paused';
    res.send(`Audio paused at ${pausedAt.toFixed(2)} seconds.`);
  } else {
    res.send('Audio is not playing.');
  }
  sendPacket();
});


app.post('/resume', (req, res) => {
  if (state === 'paused') {
    startTime = Date.now() - pausedAt * 1000;
    state = 'playing';
    res.send('Resuming audio.');
  } else {
    res.send('Audio is not paused.');
  }
  sendPacket();
});


app.post('/stop', (req, res) => {
  state = 'stopped';
  pausedAt = 0;
  audioUrl = '';
  res.send('Audio stopped.');
  sendPacket();
});


app.listen(expressPort, () => {
  console.log(`Express server is running on http://${ip}:${expressPort}`);
});
