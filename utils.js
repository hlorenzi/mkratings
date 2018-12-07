const { client } = require("./client.js")
const db = require("./db.js")


function checkMemberPermission(msg)
{
	if (msg.guild != null)
	{
		const guildMember = msg.guild.members.get(msg.author.id)
		if (guildMember)
		{
			for (const [id, role] of msg.guild.roles)
			{
				if (role.name.toLowerCase() == "mkratings" && guildMember._roles.find(r => r == id) != null)
					return true
			}
		}
	}
	
	msg.reply("\n:warning: Only users with an `mkratings` role can issue this command!")
	throw null
}


function checkMemberPermissionWith(guild, user)
{
	if (guild != null)
	{
		const guildMember = guild.members.get(user.id)
		if (guildMember)
		{
			for (const [id, role] of guild.roles)
			{
				if (role.name.toLowerCase() == "mkratings" && guildMember._roles.find(r => r == id) != null)
					return true
			}
		}
	}
	
	return false
}


function parseFixedArguments(msg, expectedNum, usage)
{
	let args = []
	let curArg = ""
	for (let i = 0; i < msg.content.length; i++)
	{
		if (msg.content[i] == " ")
		{
			if (curArg != "")
			{
				args.push(curArg)
				curArg = ""
			}
			
			continue
		}
		else if (msg.content[i] == "\"")
		{
			i++
			while (i < msg.content.length && msg.content[i] != "\"")
			{
				curArg += msg.content[i]
				i++
			}
			
			if (i >= msg.content.length || msg.content[i] != "\"")
			{
				args = null
				break
			}
			
			args.push(curArg)
			curArg = ""
		}
		else
			curArg += msg.content[i]
	}
	
	if (curArg != "" && args != null)
		args.push(curArg)
	
	if (args == null || args.length != expectedNum + 1)
	{
		msg.reply(
			"\n:warning: Invalid arguments! Correct usage:\n" +
			"`" + msg.content.split(" ")[0] + "  " + usage + "`\n" +
			"(Use double-quotes for arguments with spaces -- for example: \"Clan Name\")")
		throw null
	}
	
	return args.slice(1)
}


function findClanByNameOrTag(msg, str)
{
	let strLowercase = str.toLowerCase()
	
	let clan = db.clanRecord.clans.find(c => c.name.toLowerCase() == strLowercase)
	if (clan != null)
		return clan
	
	const clansWithTag = db.clanRecord.clans.filter(c => c.tag.toLowerCase() == strLowercase)
	if (clansWithTag.length > 1)
	{
		msg.reply("\n:warning: Multiple clans have the tag `" + str + "`. Please specify the full name!")
		throw null
	}
	
	if (clansWithTag.length == 1)
		return clansWithTag[0]
	
	msg.reply("\n:warning: Could not find a clan with name or tag `" + str + "`!")
	throw null
}


function waitForReaction(msg, emojiList, timeout)
{
	let promiseResolve = null
	let promiseReject = null
	let promise = new Promise((resolve, reject) =>
	{
		promiseResolve = resolve
		promiseReject = reject
	})
	
	let handler =
	{
		msgId: msg.id,
		emojiList: emojiList,
		promiseResolve,
		promiseReject
	}
	
	client.reactionHandlers.push(handler)
	
	return promise
}


module.exports =
{
	checkMemberPermission,
	checkMemberPermissionWith,
	parseFixedArguments,
	findClanByNameOrTag,
	waitForReaction,
}