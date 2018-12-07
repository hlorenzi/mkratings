const { client } = require("./client.js")
const db = require("./db.js")
const utils = require("./utils.js")
const settings = require("./settings.js")


async function handleCommand_newMatch(msg)
{
	utils.checkMemberPermission(msg)
	
	const args = utils.parseFixedArguments(msg, 4, "Clan1  Score1  Clan2  Score2")
	const clan1Name = args[0]
	const clan1Score = parseInt(args[1])
	const clan2Name = args[2]
	const clan2Score = parseInt(args[3])
	
	const clan1 = utils.findClanByNameOrTag(msg, clan1Name)
	const clan2 = utils.findClanByNameOrTag(msg, clan2Name)
	
	if (clan1 == null)
	{
		msg.reply("\n:warning: Could not find a clan with the name `" + clan1Name + "`!")
		throw null
	}
	
	if (clan2 == null)
	{
		msg.reply("\n:warning: Could not find a clan with the name `" + clan2Name + "`!")
		throw null
	}
	
	if (clan1 == clan2)
	{
		msg.reply("\n:warning: Invalid match results!")
		throw null
	}
	
	if (!isFinite(clan1Score) || !isFinite(clan2Score) ||
		clan1Score <= 0     || clan2Score <= 0 ||
		clan1Score >= 10000 || clan2Score >= 10000)
	{
		msg.reply("\n:warning: Invalid clan scores!")
		throw null
	}
	
	if (clan1.guildId != msg.guild.id && clan2.guildId != msg.guild.id)
	{
		msg.reply("\n:warning: Neither of the clans are registered to this server!")
		throw null
	}
	
	const longestNameLength = Math.max(5, clan1.name.length, clan2.name.length)
	
	let matchResults =
	{
		id: null,
		clan1Id: clan1.id,
		clan2Id: clan2.id,
		clan1Score: clan1Score,
		clan2Score: clan2Score,
		creationDate: new Date().getTime(),
		guildId: msg.guild.id,
		authorId: msg.author.id,
	}
	
	const eloUpdates = db.getMatchEloUpdates(matchResults)
	
	const getEloStr = (score, newScore) =>
	{
		const roundedScore = Math.round(score)
		const roundedNewScore = Math.round(newScore)
		
		if (roundedNewScore > roundedScore)
			return " (Elo +" + (roundedNewScore - roundedScore).toString() + " 📈" + roundedNewScore + ")"
		else if (roundedNewScore < roundedScore)
			return " (Elo -" + (roundedScore - roundedNewScore).toString() + " 📉" + roundedNewScore + ")"
		else
			return " (Elo +0 🔸" + roundedNewScore + ")"
	}
	
	const matchResultsStr =
		"```" +
		"\n" + clan1Score.toString().padStart(5) + " " + clan1.name + getEloStr(eloUpdates.score1, eloUpdates.newScore1) +
		"\n" + clan2Score.toString().padStart(5) + " " + clan2.name + getEloStr(eloUpdates.score2, eloUpdates.newScore2) +
		"\n" + "-------" +
		"\n" + (clan1Score + clan2Score).toString().padStart(5) + " Total" +
		"\n```"
	
	const waitingMsg = await msg.reply(
		"\n:hourglass: Registering new match results:" +
		"\n" + matchResultsStr +
		"A confirmation request was sent to the other clan! Waiting for their approval...")
	
	let thisClan = clan1
	let otherClan = clan2
	if (clan2.guildId == msg.guild.id)
	{
		thisClan = clan2
		otherClan = clan1
	}
	
	const otherClanGuildId = otherClan.guildId
	await client.syncGuilds([otherClanGuildId])
	const otherClanGuild = client.guilds.get(otherClanGuildId)
	const otherClanGuildApprovalChannel = otherClanGuild.channels.get(otherClan.approvalChannelId)
	
	const approvalMsg = await otherClanGuildApprovalChannel.send(
		"\n:inbox_tray: ***" + thisClan.name + "*** is requesting approval for new match results!" +
		"\n" + matchResultsStr +
		"React below to accept or decline.")
		
	await approvalMsg.react("✅")
	await approvalMsg.react("🚫")
	await waitingMsg.react("❌")
	
	const reaction = await Promise.race([
		utils.waitForReaction(approvalMsg, ["✅", "🚫"], settings.approvalTimeout),
		utils.waitForReaction(waitingMsg, ["❌"], settings.approvalTimeout)])
	
	//await approvalMsg.clearReactions()
	//await waitingMsg.clearReactions()
	
	if (reaction.msgId == waitingMsg.id && reaction.emoji == "❌")
	{
		await approvalMsg.edit(
			"\n:x: Match results from cancelled by ***" + thisClan.name + "***'s " + reaction.user.tag + ":" +
			"\n" + matchResultsStr)
			
		await waitingMsg.edit(
			"\n:x: Match results cancelled by " + reaction.user.tag + ":" +
			"\n" + matchResultsStr)
	}
	else if (reaction.msgId == approvalMsg.id)
	{
		if (reaction.emoji == "🚫")
		{
			await approvalMsg.edit(
				"\n:no_entry_sign: Match results from ***" + thisClan.name + "*** declined by " + reaction.user.tag + ":" +
				"\n" + matchResultsStr)
				
			await waitingMsg.edit(
				"\n:no_entry_sign: Match results declined by " + reaction.user.tag + ":" +
				"\n" + matchResultsStr)
		}
		else if (reaction.emoji == "✅")
		{
			await approvalMsg.edit(
				"\n:white_check_mark: Match results accepted by ***" + thisClan.name + "***'s " + reaction.user.tag + "!" +
				"\n" + matchResultsStr)
				
			await waitingMsg.edit(
				"\n:white_check_mark: Match results accepted by " + reaction.user.tag + "!" +
				"\n" + matchResultsStr)
				
			matchResults.id = db.matchRecord.nextMatchId
			db.matchRecord.nextMatchId++
			db.matchRecord.matches.push(matchResults)
			db.commit(db.fileMatchRecord, db.matchRecord)
			db.addMatchToClanCache(matchResults)
		}
	}
}


module.exports = { handleCommand_newMatch }