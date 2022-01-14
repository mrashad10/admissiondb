const sqlite3 = require('sqlite3').verbose()
const mqtt = require('mqtt')
let client

const db = new sqlite3.Database('/volume/messages.db', (err) => {
  if (err) console.error(err.message)
  else {
    db.run(
      'CREATE TABLE IF NOT EXISTS messages(stamp DATE NOT NULL DEFAULT CURRENT_TIMESTAMP, username VARCHAR(64), key VARCHAR(256))'
    )
  }
  
  connect()
})

async function connect () {
  try {
    client = mqtt.connect('mqtt://admission_rabbitmq:1883')
    client.on('connect', () => {
      console.log('Rabbit is connected')
      client.subscribe('session')
    })

    client.on('message', (topic, data) => {
      console.log('Message received')

      data = JSON.parse(data.toString())
      console.log('Received data:', data)
      let query = 'INSERT INTO messages (username, key)'
      query += ' SELECT ?, ?'
      query +=
        ' WHERE NOT EXISTS (SELECT 1 FROM messages WHERE username = ? and key = ?)'

      db.run(
        query,
        [data.username, data.key, data.username, data.key],
        (err) => {
          if (err) throw err
          console.log('DB updated')
        }
      )
    })
  } catch (error) {
    console.log('Rabbit is down')
    setTimeout(connect, 1000)
  }
}
