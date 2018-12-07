const { client } = require("./client.js")
const db = require("./db.js")
const utils = require("./utils.js")


async function handleCommand_viewClan(msg)
{
	const args = utils.parseFixedArguments(msg, 1, "ClanFullName")
	const clanName = args[0]
	
	const clan = utils.findClanByNameOrTag(msg, clanName)
	
	if (clan == null)
	{
		msg.reply("\n:warning: Could not find a clan with that name!")
		throw null
	}
	
	await client.syncGuilds(client.guilds)
	const guild = client.guilds.get(clan.guildId)
	const author = await client.fetchUser(clan.authorId)
	const creationDate = new Date(clan.creationDate)
	
	const clanCache = db.getClanCache(clan.id)
	const eloRank = db.getClanEloRank(clan.id)
	
	let reply =
		"\n:scroll: Clan information:" +
		"\n```c" +
		"\n           Name: " + clan.name +
		"\n            Tag: " + clan.tag +
		"\n             ID: " + clan.id +
		"\n         Server: " + guild.name + //" <" + clan.guildId + ">" +
		"\n        Creator: " + author.tag + //" <" + clan.authorId + ">" +
		"\n  Creation Date: " + creationDate.toUTCString() +
		"\n" +
		"\n    Current Elo: " + Math.round(clanCache.elo) + " (#" + eloRank + " of " + db.clanRecord.clans.length + ")" +
		"\n        Matches: " + (clanCache.wins + clanCache.draws + clanCache.losses) +
		" (" + clanCache.wins + " - " + clanCache.draws + " - " + clanCache.losses + ")" +
		"\n" +
		"\n Recent Matches: "
		
	if (clanCache.recentMatches.length == 0)
		reply += "\n [no recent matches]"
		
	for (const match of clanCache.recentMatches)
	{
		const clan1 = db.getClanById(match.clan1Id)
		const clan2 = db.getClanById(match.clan2Id)
		
		reply +=
			"\n [" + new Date(match.creationDate).toDateString().padEnd(15) + "] " +
			clan1.name.padStart(25) + " " + match.clan1Score.toString().padStart(5) + " | " +
			match.clan2Score.toString().padEnd(5) + " " + clan2.name
	}
		
	reply +=
		"\n```"
		
	msg.reply(reply)
}


module.exports = { handleCommand_viewClan }