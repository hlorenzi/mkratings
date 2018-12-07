const fs = require("fs")


const dbFolder = "./db"
const fileClanRecord = "clans.json"
const fileMatchRecord = "matches.json"


if (!fs.existsSync(dbFolder))
	fs.mkdirSync(dbFolder)


function load(filename)
{
	if (!fs.existsSync(dbFolder + "/" + filename))
		return null
	
	return JSON.parse(fs.readFileSync(dbFolder + "/" + filename, "utf8"))
}


function commit(filename, object)
{
	fs.writeFileSync(dbFolder + "/" + filename, JSON.stringify(object), "utf8")
}


let clanRecord = load(fileClanRecord) ||
{
	nextClanId: 0,
	clans: []
}


let matchRecord = load(fileMatchRecord) ||
{
	nextMatchId: 0,
	matches: []
}


let clanCache =
{
	cacheByClanId: new Map(),
	clansSortedByElo: []
}


function getClanById(id)
{
	return clanRecord.clans.find(c => c.id == id)
}


function getClanCache(id)
{
	let clan = clanCache.cacheByClanId.get(id)
	if (clan)
		return clan
	
	clan =
	{
		wins: 0,
		draws: 0,
		losses: 0,
		elo: 1000,
		recentMatches: []
	}
	
	clanCache.cacheByClanId.set(id, clan)
	
	return clan
}


function getClanEloRank(id)
{
	let index = clanCache.clansSortedByElo.findIndex(c => c.id == id)
	if (index < 0)
		return null
	
	const thisElo = getClanCache(clanCache.clansSortedByElo[index].id).elo
	while (index > 0 && getClanCache(clanCache.clansSortedByElo[index - 1].id).elo == thisElo)
		index--
	
	return (index + 1)
}


function addMatchToClanCache(match)
{
	let clan1 = getClanCache(match.clan1Id)
	let clan2 = getClanCache(match.clan2Id)
	
	if (match.clan1Score > match.clan2Score)
	{
		clan1.wins++
		clan2.losses++
	}
	else if (match.clan1Score < match.clan2Score)
	{
		clan1.losses++
		clan2.wins++
	}
	else
	{
		clan1.draws++
		clan2.draws++
	}
	
	const eloUpdates = getMatchEloUpdates(match)
	clan1.elo = eloUpdates.newScore1
	clan2.elo = eloUpdates.newScore2
	
	const addRecentMatch = (clan, match) =>
	{
		if (clan.recentMatches.length >= 10)
			clan.recentMatches = clan.recentMatches.slice(0, 10)
		
		clan.recentMatches.splice(0, 0, match)
	}
	
	addRecentMatch(clan1, match)
	addRecentMatch(clan2, match)
	finishUpdatingClanCache()
}


function finishUpdatingClanCache()
{
	clanCache.clansSortedByElo.sort((a, b) => getClanCache(b.id).elo - getClanCache(a.id).elo)
}


function getMatchEloUpdates(match)
{
	let clan1 = getClanCache(match.clan1Id)
	let clan2 = getClanCache(match.clan2Id)
	
	if (match.clan1Score > match.clan2Score)
		eloUpdates = eloCalculateUpdate(clan1.elo, clan2.elo, 0)
	else if (match.clan1Score < match.clan2Score)
		eloUpdates = eloCalculateUpdate(clan1.elo, clan2.elo, 1)
	else
		eloUpdates = eloCalculateUpdate(clan1.elo, clan2.elo, 0.5)
	
	return { score1: clan1.elo, score2: clan2.elo, newScore1: eloUpdates.newScore1, newScore2: eloUpdates.newScore2 }
}


for (const clan of clanRecord.clans)
	clanCache.clansSortedByElo.push(clan)

for (const match of matchRecord.matches)
	addMatchToClanCache(match)

finishUpdatingClanCache()


function eloProbabilityOfWinning(myScore, theirScore)
{
	return 1 / (1 + Math.pow(10, (myScore - theirScore) / 400)) 
}


function eloRatio(score)
{
	if (score < 600) return 25
	else if (score < 2400) return 15
	else if (score < 3000) return 10
	else return 5
}


function eloCalculateUpdate(score1, score2, whoWon)
{
	const p1 = eloProbabilityOfWinning(score1, score2)
	const p2 = eloProbabilityOfWinning(score2, score1)
	
	const r1 = eloRatio(score1) * (1 - whoWon - p1)
	const r2 = eloRatio(score2) * (    whoWon - p2)
	
	return { newScore1: score1 + r1, newScore2: score2 + r2 }
}


module.exports =
{
	fileClanRecord, fileMatchRecord,
	commit,
	clanRecord, matchRecord,
	clanCache,
	getClanById, getClanEloRank,
	getClanCache, addMatchToClanCache,
	getMatchEloUpdates,
}