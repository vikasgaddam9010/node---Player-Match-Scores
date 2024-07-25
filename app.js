const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const dataBasePath = path.join(__dirname, 'cricketMatchDetails.db')
let dataBase = null

//Server and Data Base Connectivity Establishment
const serverAndDataBaseStart = async () => {
  try {
    dataBase = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    })
    console.log('Server Started...1')
  } catch (err) {
    console.log(err.message)
    process.exit(1)
  }
}

serverAndDataBaseStart()

//Convert players Pascal to Camel Case
const pascalToCamelCase = eachPlayer => {
  return {
    playerId: eachPlayer.player_id,
    playerName: eachPlayer.player_name,
  }
}

// Convert Matchs Pascal to Camel Case
const matchPascalToCamelCase = eachMatch => {
  return {
    matchId: eachMatch.match_id,
    match: eachMatch.match,
    year: eachMatch.year,
  }
}
const pascalCaseToCamelCase = dataBaseResponse => {
  return {
    matchId: dataBaseResponse.match_id,
    match: dataBaseResponse.match,
    year: dataBaseResponse.year,
  }
}

//1 GET API
app.get('/players/', async (req, res) => {
  const sqlQuery = `SELECT * FROM player_details;`
  const playersList = await dataBase.all(sqlQuery)
  res.send(playersList.map(eachPlayer => pascalToCamelCase(eachPlayer)))
})

//2 Get a Player API

app.get('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const sqlQuery = `SELECT * FROM player_details WHERE player_id = ${playerId};`
  const playersDetails = await dataBase.get(sqlQuery)
  res.send(pascalToCamelCase(playersDetails))
})

//3 PUT / Update API
app.put('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const clientRequest = req.body
  const {playerName} = clientRequest
  const sqlQuery = `
  UPDATE player_details
  SET
    player_name = '${playerName}'
  WHERE player_id = ${playerId};`
  await dataBase.run(sqlQuery)
  res.send('Player Details Updated')
})

//4 Get a Match API
app.get('/matches/:matchId/', async (req, res) => {
  const {matchId} = req.params
  const sqlQuery = `SELECT * FROM match_details WHERE match_id = ${matchId};`
  const dataBaseResponse = await dataBase.get(sqlQuery)
  res.send(pascalCaseToCamelCase(dataBaseResponse))
})

//5 GET player wise match API
app.get('/players/:playerId/matches', async (req, res) => {
  const {playerId} = req.params
  const sqlQuery = `SELECT * FROM player_match_score NATURAL JOIN match_details
  WHERE player_match_score.player_id = ${playerId};`
  const playersDetails = await dataBase.all(sqlQuery)
  res.send(playersDetails.map(each => matchPascalToCamelCase(each)))
})
//6 GET player wise match API
app.get('/matches/:matchId/players', async (req, res) => {
  const {matchId} = req.params
  const sqlQuery = `SELECT * FROM player_details INNER JOIN player_match_score 
  ON player_details.player_id = player_match_score.player_id 
  WHERE player_match_score.match_id = ${matchId};`
  const db = await dataBase.all(sqlQuery)
  res.send(db.map(each => pascalToCamelCase(each)))
})
const convertEachPlayerScores = db => {
  return {
    playerId: db.player_id,
    playerName: db.player_name,
    totalScore: db.score,
    totalFours: db.fours,
    totalSixes: db.sixes,
  }
}
//7 GET a player wise statistics
app.get('/players/:playerId/playerScores', async (req, res) => {
  const {playerId} = req.params
  const sqlQuery = `SELECT player_match_score.player_id AS player_id, player_details.player_name AS player_name, SUM(score) AS score, SUM(fours) as fours, SUm(sixes) AS sixes FROM player_match_score 
  INNER JOIN player_details ON player_match_score.player_id = player_details.player_id 
  WHERE player_match_score.player_id =${playerId};`
  const db = await dataBase.get(sqlQuery)
  res.send(convertEachPlayerScores(db))
})
app.listen(3000)
module.exports = app
