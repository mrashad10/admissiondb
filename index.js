const sqlite3 = require('sqlite3').verbose()
const amqp = require('amqplib')
let channel, connection

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
    connection = await amqp.connect('amqp://admission_rabbitmq:5672')
    channel = await connection.createChannel()
    await channel.assertQueue('session')
    channel.consume('session', (dataBuffer) => {
      console.log('Message received')
      const data = JSON.parse(Buffer.from(dataBuffer.content))
      console.log('Received data:', data)
      let query = 'INSERT INTO messages (username, key)'
      query += ' SELECT ?, ?'
      query += ' WHERE NOT EXISTS (SELECT 1 FROM messages WHERE username = ? and key = ?)'

      db.run(
        query,
        [data.username, data.key, data.username, data.key],
        (err) => {
          if (err) throw err
          channel.ack(dataBuffer)
          console.log('Message acknowledged')
        }
      )
    })
  } catch (error) {
    console.log('Rabbit is down')
    setTimeout(connect, 1000)
  }
}
