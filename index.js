
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Starte den WebSocket-Server auf Port 8080
const port = 8080;
const wss = new WebSocket.Server({ port: port });
const app = express();



// Globale Variablen zur Steuerung
let startTime = 0;      // Zeitpunkt, an dem die Wiedergabe (oder Resumé) gestartet wurde
let audioUrl = '';      // Aktuelle Audioquelle
let isPaused = false;   // Status: spielt gerade (false) oder pausiert (true)
let pausedAt = 0;       // Aktuelle Wiedergabezeit in Sekunden, wenn pausiert

setInterval(() => {

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          if (!isPaused) {
            // Berechne die aktuelle Abspielposition (in Sekunden)
            const currentTime = (Date.now() - startTime) / 1000;
            const message = JSON.stringify({
              action: 'play',
              audio_url: audioUrl,
              currentTime: currentTime
            });
            client.send(message);
          } else {
            // Sende den pausierten Status mit der abgespielten Zeit
            const message = JSON.stringify({
              action: 'pause',
              audio_url: audioUrl,
              pausedAt: pausedAt
            });
            client.send(message);
          }
        }
      });

}, 100);


function playAudio(url){
    startTime = Date.now();
    audioUrl = url;
    //audioUrl = 'http://127.0.0.1:3000/CL5.mp3';
}


// Serve .mp3 files from the current directory
app.get('/:filename.mp3', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, `${filename}.mp3`);
    res.sendFile(filePath);
});

app.get('/play/:filename.mp3', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, `${filename}.mp3`);
    const url = 'http://127.0.0.1:3000/' + filename + '.mp3';
    playAudio(url);
    res.send('Playing ' + url);
});


app.get('/pause', (req, res) => {
    if (!isPaused && startTime !== 0) {
      // Berechne, wie viele Sekunden bereits abgespielt wurden
      pausedAt = (Date.now() - startTime) / 1000;
      isPaused = true;
      res.send(`Audio paused at ${pausedAt.toFixed(2)} seconds.`);
    } else {
      res.send('Audio is already paused or not started yet.');
    }
  });

  app.get('/resume', (req, res) => {
    if (isPaused) {
      // Aktualisiere den Startzeitpunkt so, dass die Wiedergabe an der richtigen Stelle fortgesetzt wird
      startTime = Date.now() - pausedAt * 1000;
      isPaused = false;
      res.send('Resuming audio.');
    } else {
      res.send('Audio is not paused.');
    }
  });

app.listen(3000, () => {
    console.log(`Express server is running on http://localhost:3000`);
});