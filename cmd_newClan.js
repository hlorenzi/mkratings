const db = require("./db.js")
const utils = require("./utils.js")
const settings = require("./settings.js")


function handleCommand_newClan(msg)
{
	utils.checkMemberPermission(msg)
	
	const args = utils.parseFixedArguments(msg, 1, "ClanFullName")
	const clanName = args[0].trim()
	
	if (clanName.length <= 0 || clanName.length >= 50)
	{
		msg.reply("\n:warning: Invalid clan name!")
		throw null
	}
	
	if (db.clanRecord.clans.find(c => c.name == clanName))
	{
		msg.reply("\n:warning: This clan name has already been registered!\n(Tip: use `" + settings.commandPrefix + "ViewClan`)")
		throw null
	}
	
	if (db.clanRecord.clans.reduce((accum, c) => accum + (c.guildId == msg.guild.id ? 1 : 0), 0) >= settings.maxAllowedClansPerGuild)
	{
		msg.reply("\n:warning: This server has reached its limit of clan registrations!")
		throw null
	}
	
	let automaticTag = ""
	for (const part of clanName.split(" "))
		automaticTag += part[0]
	
	db.clanRecord.clans.push(
	{
		id: db.clanRecord.nextClanId,
		name: clanName,
		tag: automaticTag,
		game: null,
		creationDate: new Date().getTime(),
		guildId: msg.guild.id,
		authorId: msg.author.id,
		approvalChannelId: msg.channel.id,
	})
	db.clanRecord.nextClanId++
	db.commit(db.fileClanRecord, db.clanRecord)
	
	msg.reply(
		"\n:confetti_ball: Registered new clan: `" + clanName + "`! (automatic tag: `" + automaticTag + "`)\n" +
		"Try the following commands to customize your registration:\n" +
		"`" + settings.commandPrefix + "SetClanTag`, " +
		"`" + settings.commandPrefix + "SetClanGame` ")
}


module.exports = { handleCommand_newClan }